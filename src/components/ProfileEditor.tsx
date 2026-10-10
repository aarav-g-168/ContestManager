"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertDialog } from "radix-ui";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useTheme } from "next-themes";
import {
  ArrowUpRight,
  AtSign,
  Bell,
  Bookmark,
  BriefcaseBusiness,
  Building2,
  Check,
  Code2,
  GitFork,
  Globe2,
  LoaderCircle,
  LockKeyhole,
  Mail,
  MapPin,
  Moon,
  Save,
  ShieldCheck,
  Sun,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "./AuthProvider";
import { ProfileSaveError, useProfile } from "./ProfileProvider";
import { useBookmarks } from "@/hooks/bookmarks";
import { useReminders } from "@/hooks/reminders";
import {
  codingProfileUrl,
  normalizeProfile,
  profileLimits,
  validateProfile,
  type AvatarAction,
  type ProfileErrors,
  type ProfileField,
  type SavedProfile,
} from "@/lib/profile";
import AvatarPicker from "./AvatarPicker";
import ProfileAvatar from "./ProfileAvatar";

const socialFields = [
  {
    key: "website",
    label: "Website / portfolio",
    placeholder: "https://yoursite.com",
    icon: Globe2,
  },
  {
    key: "github",
    label: "GitHub",
    placeholder: "https://github.com/yourname",
    icon: GitFork,
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    placeholder: "https://linkedin.com/in/yourname",
    icon: BriefcaseBusiness,
  },
  {
    key: "x",
    label: "X / Twitter",
    placeholder: "https://x.com/yourname",
    icon: AtSign,
  },
] as const;
const codingFields = [
  {
    key: "codeforces",
    label: "Codeforces",
    prefix: "codeforces.com/profile/",
    mark: "Cf",
  },
  { key: "leetcode", label: "LeetCode", prefix: "leetcode.com/u/", mark: "Lc" },
  { key: "atcoder", label: "AtCoder", prefix: "atcoder.jp/users/", mark: "At" },
  {
    key: "codechef",
    label: "CodeChef",
    prefix: "codechef.com/users/",
    mark: "Cc",
  },
] as const;

export default function ProfileEditor({ initial }: { initial: SavedProfile }) {
  const router = useRouter();
  const { user } = useAuth();
  const account = useProfile();
  const bookmarks = useBookmarks();
  const reminders = useReminders();
  const { resolvedTheme, setTheme } = useTheme();
  const [draft, setDraft] = useState(initial.values);
  const [baseline, setBaseline] = useState(initial);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarAction, setAvatarAction] = useState<AvatarAction>("keep");
  const [localPhoto, setLocalPhoto] = useState<string | null>(null);
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [saveError, setSaveError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [leaveTo, setLeaveTo] = useState<string | null>(null);
  const errorSummary = useRef<HTMLDivElement>(null);
  const dirty =
    JSON.stringify(draft) !== JSON.stringify(baseline.values) ||
    !!avatar ||
    avatarAction !== "keep";
  useEffect(() => {
    if (!avatar) {
      setLocalPhoto(null);
      return;
    }
    const url = URL.createObjectURL(avatar);
    setLocalPhoto(url);
    return () => URL.revokeObjectURL(url);
  }, [avatar]);
  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
  useEffect(() => {
    if (!dirty) return;
    const handleLink = (event: MouseEvent) => {
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const anchor =
        event.target instanceof Element
          ? event.target.closest("a[href]")
          : null;
      if (
        !(anchor instanceof HTMLAnchorElement) ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download")
      )
        return;
      const url = new URL(anchor.href);
      if (
        url.origin !== location.origin ||
        (url.pathname === location.pathname && url.search === location.search)
      )
        return;
      event.preventDefault();
      event.stopImmediatePropagation();
      setLeaveTo(`${url.pathname}${url.search}${url.hash}`);
    };
    document.addEventListener("click", handleLink, true);
    return () => document.removeEventListener("click", handleLink, true);
  }, [dirty]);
  const photo =
    localPhoto ||
    (avatarAction === "remove"
      ? null
      : avatarAction === "google"
        ? (user?.photoURL ?? null)
        : account.photoURL);
  const normalized = normalizeProfile(draft);
  const previewErrors = validateProfile(normalized);
  const links = socialFields.filter(
    (field) => normalized[field.key] && !previewErrors[field.key],
  );
  const handles = codingFields.filter(
    (field) => normalized[field.key] && !previewErrors[field.key],
  );
  function update(key: ProfileField, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setSaved(false);
    setSaveError("");
  }
  function field(key: ProfileField) {
    return {
      id: `profile-${key}`,
      name: key,
      value: draft[key],
      maxLength: profileLimits[key],
      disabled: saving,
      "aria-invalid": !!errors[key],
      "aria-describedby": errors[key] ? `error-${key}` : undefined,
      onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        update(key, event.target.value),
      onBlur: () =>
        setErrors((current) => ({
          ...current,
          [key]: validateProfile(normalizeProfile(draft))[key],
        })),
    };
  }
  function fieldError(key: ProfileField) {
    return errors[key] ? (
      <p id={`error-${key}`} className="profile-field-error">
        {errors[key]}
      </p>
    ) : null;
  }
  function discard() {
    setDraft(baseline.values);
    setAvatar(null);
    setAvatarAction("keep");
    setErrors({});
    setSaveError("");
    setSaved(false);
    setConflict(false);
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    const values = normalizeProfile(draft);
    const validation = validateProfile(values);
    setErrors(validation);
    setSaveError("");
    setSaved(false);
    if (Object.keys(validation).length) {
      requestAnimationFrame(() => errorSummary.current?.focus());
      return;
    }
    setSaving(true);
    try {
      const result = await account.save(
        values,
        avatar,
        avatarAction,
        baseline.revision,
      );
      setBaseline(result);
      setDraft(result.values);
      setAvatar(null);
      setAvatarAction("keep");
      setConflict(false);
      setSaved(true);
      toast.success("Profile saved.");
    } catch (error) {
      if (error instanceof ProfileSaveError) {
        setErrors(error.fields);
        setConflict(error.status === 409);
      }
      setSaveError(
        error instanceof Error
          ? error.message
          : "We couldn’t save your changes. Try again.",
      );
      requestAnimationFrame(() => errorSummary.current?.focus());
    } finally {
      setSaving(false);
    }
  }
  if (!user) return null;
  return (
    <div className="profile-layout">
      <aside className="profile-sidebar" aria-label="Your profile preview">
        <div className="profile-preview surface">
          <div className="profile-preview-cover">
            <span>Profile preview</span>
            <Code2 size={28} strokeWidth={1.25} aria-hidden="true" />
          </div>
          <div className="profile-preview-body">
            <div className="profile-preview-photo">
              <ProfileAvatar src={photo} name={draft.displayName} />
            </div>
            <h2>{draft.displayName.trim() || "Your name"}</h2>
            <p className="profile-preview-headline">
              {draft.headline.trim() || "Add a short headline"}
            </p>
            {draft.bio.trim() && (
              <p className="profile-preview-bio">{draft.bio}</p>
            )}
            <div className="profile-preview-details">
              {draft.location && (
                <p>
                  <MapPin size={14} aria-hidden="true" />
                  {draft.location}
                </p>
              )}
              {draft.organization && (
                <p>
                  <Building2 size={14} aria-hidden="true" />
                  {draft.organization}
                </p>
              )}
            </div>
            {!!links.length && (
              <div className="profile-preview-socials">
                {links.map(({ key, label, icon: Icon }) => (
                  <a
                    key={key}
                    href={normalized[key]}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`${label} (opens in a new tab)`}
                  >
                    <Icon size={16} aria-hidden="true" />
                    {key === "website" ? "Website" : key === "x" ? "X" : label}
                    <ArrowUpRight size={12} aria-hidden="true" />
                  </a>
                ))}
              </div>
            )}
            {!!handles.length && (
              <div className="profile-preview-handles">
                <p>Coding profiles</p>
                {handles.map(({ key, label, mark }) => (
                  <a
                    key={key}
                    href={codingProfileUrl(key, normalized[key])}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`${label}: ${draft[key]} (opens in a new tab)`}
                  >
                    <span>{mark}</span>
                    <span>{draft[key]}</span>
                    <ArrowUpRight size={13} aria-hidden="true" />
                  </a>
                ))}
              </div>
            )}
            <p className="profile-private-note">
              <LockKeyhole size={13} aria-hidden="true" />
              Personal profile · not published
            </p>
          </div>
        </div>
        <div className="profile-activity surface">
          {[
            {
              href: "/bookmarks",
              label: "Saved contests",
              value: bookmarks.loading
                ? "…"
                : bookmarks.error
                  ? "—"
                  : bookmarks.bookmarkedContests.length,
              icon: Bookmark,
            },
            {
              href: "/reminders",
              label: "Email reminders",
              value: reminders.loading
                ? "…"
                : reminders.error
                  ? "—"
                  : Object.keys(reminders.reminders).length,
              icon: Bell,
            },
          ].map(({ href, label, value, icon: Icon }) => (
            <Link key={href} href={href}>
              <Icon size={16} aria-hidden="true" />
              <span>{label}</span>
              <strong>{value}</strong>
              <ArrowUpRight size={13} aria-hidden="true" />
            </Link>
          ))}
        </div>
        <p className="profile-sidebar-note">
          The preview updates as you edit. Save when you’re ready.
        </p>
      </aside>
      <form
        className="profile-form"
        onSubmit={submit}
        noValidate
        aria-label="Edit your profile"
      >
        <nav className="profile-section-nav" aria-label="Profile sections">
          {[
            { id: "about", label: "About you" },
            { id: "links", label: "Social links" },
            { id: "coding", label: "Coding handles" },
            { id: "preferences", label: "Preferences" },
          ].map((item) => (
            <a key={item.id} href={`#profile-${item.id}`}>
              {item.label}
            </a>
          ))}
        </nav>
        {(Object.values(errors).some(Boolean) || saveError) && (
          <div
            ref={errorSummary}
            className="profile-error-summary"
            role="alert"
            tabIndex={-1}
          >
            <h2>
              {saveError || "Check the highlighted fields before saving."}
            </h2>
            {Object.entries(errors)
              .filter(([, error]) => !!error)
              .map(([key, error]) => (
                <a
                  key={key}
                  href={`#profile-${key}`}
                  onClick={(event) => {
                    event.preventDefault();
                    document.getElementById(`profile-${key}`)?.focus();
                  }}
                >
                  {error}
                </a>
              ))}
            {conflict && (
              <button
                type="button"
                className="profile-inline-button"
                onClick={() => {
                  if (
                    window.confirm(
                      "Reload your saved profile and discard these unsaved changes?",
                    )
                  )
                    void account.reload();
                }}
              >
                Reload saved profile
              </button>
            )}
          </div>
        )}
        <section id="profile-about" className="profile-section surface">
          <div className="profile-section-heading">
            <span>01</span>
            <div>
              <h2>About you</h2>
              <p>A few details to make this account yours.</p>
            </div>
          </div>
          <AvatarPicker
            src={photo}
            name={draft.displayName}
            disabled={saving}
            canUseGoogle={
              !!user.photoURL && (avatarAction !== "google" || !!avatar)
            }
            onChange={(file) => {
              setAvatar(file);
              setAvatarAction("keep");
              setSaved(false);
            }}
            onRemove={() => {
              setAvatar(null);
              setAvatarAction("remove");
              setSaved(false);
            }}
            onGoogle={() => {
              setAvatar(null);
              setAvatarAction("google");
              setSaved(false);
            }}
          />
          {account.photoError && (
            <p className="profile-field-error">
              Your saved photo couldn’t load. You can upload a new one or retry
              loading your profile.
            </p>
          )}
          <div className="profile-fields-grid mt-7">
            <div className="profile-field">
              <label htmlFor="profile-displayName">
                Display name <span>Required</span>
              </label>
              <input
                {...field("displayName")}
                autoComplete="name"
                required
                placeholder="Your name"
              />
              {fieldError("displayName")}
            </div>
            <div className="profile-field">
              <label htmlFor="profile-headline">
                Headline <span>Optional</span>
              </label>
              <input
                {...field("headline")}
                placeholder="e.g. CS student · competitive programmer"
              />
              {fieldError("headline")}
            </div>
            <div className="profile-field profile-field-wide">
              <label htmlFor="profile-bio">
                Short bio <span>Optional</span>
              </label>
              <textarea
                {...field("bio")}
                rows={4}
                placeholder="What do you enjoy building or solving?"
              />
              <div className="flex items-start justify-between gap-4">
                <p className="profile-helper">
                  A little about your interests and what you’re working on.
                </p>
                <span className="profile-character-count">
                  {draft.bio.length}/300
                </span>
              </div>
              {fieldError("bio")}
            </div>
            <div className="profile-field">
              <label htmlFor="profile-location">
                Location <span>Optional</span>
              </label>
              <input
                {...field("location")}
                autoComplete="address-level2"
                placeholder="City, country"
              />
              {fieldError("location")}
            </div>
            <div className="profile-field">
              <label htmlFor="profile-organization">
                School or company <span>Optional</span>
              </label>
              <input
                {...field("organization")}
                autoComplete="organization"
                placeholder="Where you study or work"
              />
              {fieldError("organization")}
            </div>
          </div>
        </section>
        <section id="profile-links" className="profile-section surface">
          <div className="profile-section-heading">
            <span>02</span>
            <div>
              <h2>Social links</h2>
              <p>
                Keep your work and profiles in one place. All links are
                optional.
              </p>
            </div>
          </div>
          <div className="profile-fields-grid">
            {socialFields.map(({ key, label, placeholder, icon: Icon }) => (
              <div key={key} className="profile-field">
                <label htmlFor={`profile-${key}`}>
                  <Icon size={15} aria-hidden="true" />
                  {label}
                </label>
                <input
                  {...field(key)}
                  type="url"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder={placeholder}
                />
                {fieldError(key)}
              </div>
            ))}
          </div>
          <p className="profile-helper mt-4">
            Use a profile link rather than a link to a post or repository.
          </p>
        </section>
        <section id="profile-coding" className="profile-section surface">
          <div className="profile-section-heading">
            <span>03</span>
            <div>
              <h2>Coding handles</h2>
              <p>Add the handles you use on contest platforms.</p>
            </div>
          </div>
          <div className="profile-fields-grid">
            {codingFields.map(({ key, label, prefix }) => (
              <div key={key} className="profile-field">
                <label htmlFor={`profile-${key}`}>
                  {label}
                  <span>Optional</span>
                </label>
                <div className="profile-handle-input">
                  <span aria-hidden="true">@</span>
                  <input
                    {...field(key)}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="your_handle"
                  />
                </div>
                <p className="profile-helper">{prefix}</p>
                {fieldError(key)}
              </div>
            ))}
          </div>
        </section>
        <section id="profile-preferences" className="profile-section surface">
          <div className="profile-section-heading">
            <span>04</span>
            <div>
              <h2>Account & preferences</h2>
              <p>Your sign-in details and display settings.</p>
            </div>
          </div>
          <div className="profile-account-email">
            <Mail size={17} aria-hidden="true" />
            <div>
              <span>Sign-in email</span>
              <p>{user.email}</p>
            </div>
            <ShieldCheck size={18} aria-hidden="true" />
          </div>
          <p className="profile-helper mt-2">
            Managed by your Google account. This can’t be edited here.
          </p>
          <div className="profile-appearance">
            <div>
              <h3>Appearance</h3>
              <p>Applies immediately on this device.</p>
            </div>
            <div
              role="group"
              aria-label="Appearance"
              className="profile-theme-options"
            >
              {[
                { value: "light", label: "Light", icon: Sun },
                { value: "dark", label: "Dark", icon: Moon },
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTheme(value)}
                  aria-pressed={resolvedTheme === value}
                >
                  <Icon size={15} aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="profile-timezone">
            <Globe2 size={15} aria-hidden="true" />
            <span>Contest times</span>
            <strong>IST · UTC+5:30</strong>
          </div>
        </section>
        <div className="profile-save-bar">
          <p role="status">
            {saving ? (
              <>
                <LoaderCircle
                  size={15}
                  className="animate-spin"
                  aria-hidden="true"
                />
                Saving your profile…
              </>
            ) : dirty ? (
              <>
                <span className="profile-unsaved-dot" />
                Unsaved changes
              </>
            ) : saved ? (
              <>
                <Check size={16} className="text-success" aria-hidden="true" />
                All changes saved
              </>
            ) : (
              <>
                <ShieldCheck size={15} aria-hidden="true" />
                Your profile is up to date
              </>
            )}
          </p>
          <div>
            <button
              type="button"
              className="profile-quiet-button"
              disabled={!dirty || saving}
              onClick={discard}
            >
              Discard
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={!dirty || saving}
            >
              {saving ? (
                <LoaderCircle
                  size={15}
                  className="animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <Save size={15} aria-hidden="true" />
              )}
              Save changes
            </button>
          </div>
        </div>
        <AlertDialog.Root
          open={!!leaveTo}
          onOpenChange={(open) => {
            if (!open) setLeaveTo(null);
          }}
        >
          <AlertDialog.Portal>
            <AlertDialog.Overlay className="fixed inset-0 z-[60] bg-black/60" />
            <AlertDialog.Content className="photo-crop-dialog">
              <AlertDialog.Title className="text-xl font-medium">
                Leave without saving?
              </AlertDialog.Title>
              <AlertDialog.Description className="profile-helper mt-3">
                Your latest profile edits haven’t been saved. You can keep
                editing or discard them and leave.
              </AlertDialog.Description>
              <div className="mt-6 flex flex-wrap justify-end gap-3">
                <AlertDialog.Cancel asChild>
                  <button type="button" className="btn-secondary">
                    Keep editing
                  </button>
                </AlertDialog.Cancel>
                <AlertDialog.Action asChild>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => {
                      const destination = leaveTo;
                      discard();
                      setLeaveTo(null);
                      if (destination) router.push(destination);
                    }}
                  >
                    Discard and leave
                  </button>
                </AlertDialog.Action>
              </div>
            </AlertDialog.Content>
          </AlertDialog.Portal>
        </AlertDialog.Root>
      </form>
    </div>
  );
}
