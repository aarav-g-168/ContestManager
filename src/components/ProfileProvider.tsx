"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthProvider";
import type {
  AvatarAction,
  ProfileErrors,
  ProfileValues,
  SavedProfile,
} from "@/lib/profile";

export class ProfileSaveError extends Error {
  constructor(
    message: string,
    public fields: ProfileErrors = {},
    public status = 0,
  ) {
    super(message);
  }
}
const ProfileContext = createContext<{
  profile: SavedProfile | null;
  photoURL: string | null;
  photoError: boolean;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  save: (
    values: ProfileValues,
    avatar: File | null,
    action: AvatarAction,
    revision: number,
  ) => Promise<SavedProfile>;
}>({
  profile: null,
  photoURL: null,
  photoError: false,
  loading: true,
  error: null,
  reload: async () => {},
  save: async () => {
    throw new Error("Profile unavailable");
  },
});

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<{
    uid: string;
    profile: SavedProfile | null;
    photoURL: string | null;
    photoError: boolean;
    error: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const currentUid = useRef(user?.uid);
  useEffect(() => {
    currentUid.current = user?.uid;
  }, [user?.uid]);
  const blobURL = useRef<string | null>(null);
  const requestController = useRef<AbortController | null>(null);
  const replaceBlob = useCallback((next: string | null) => {
    if (blobURL.current && blobURL.current !== next)
      URL.revokeObjectURL(blobURL.current);
    blobURL.current = next;
  }, []);
  const reload = useCallback(async () => {
    if (!user) return;
    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${await user.getAccessToken()}` };
      const response = await fetch("/api/profile", {
        headers,
        signal: controller.signal,
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "We couldn’t load your profile.");
      const profile = data.profile as SavedProfile;
      let photoURL: string | null =
        profile.avatarMode === "google" ? user.photoURL : null;
      let photoError = false;
      if (profile.avatarMode === "custom") {
        try {
          const photo = await fetch("/api/profile/photo", {
            headers,
            signal: controller.signal,
            cache: "no-store",
          });
          if (!photo.ok) throw new Error();
          photoURL = URL.createObjectURL(await photo.blob());
        } catch {
          photoError = true;
        }
      }
      if (controller.signal.aborted || currentUid.current !== user.uid) {
        if (photoURL?.startsWith("blob:")) URL.revokeObjectURL(photoURL);
        return;
      }
      replaceBlob(photoURL?.startsWith("blob:") ? photoURL : null);
      setState({ uid: user.uid, profile, photoURL, photoError, error: null });
    } catch (error) {
      if (!controller.signal.aborted && currentUid.current === user.uid)
        setState({
          uid: user.uid,
          profile: null,
          photoURL: null,
          photoError: false,
          error:
            error instanceof Error
              ? error.message
              : "We couldn’t load your profile. Please try again.",
        });
    } finally {
      if (currentUid.current === user.uid && !controller.signal.aborted)
        setLoading(false);
    }
  }, [user, replaceBlob]);
  useEffect(() => {
    setState(null);
    replaceBlob(null);
    if (user) void reload();
    return () => {
      requestController.current?.abort();
      replaceBlob(null);
    };
  }, [user, reload, replaceBlob]);

  async function save(
    values: ProfileValues,
    avatar: File | null,
    avatarAction: AvatarAction,
    revision: number,
  ) {
    if (!user)
      throw new ProfileSaveError(
        "Sign in again to save your profile.",
        {},
        401,
      );
    const form = new FormData();
    form.set("profile", JSON.stringify(values));
    form.set("revision", String(revision));
    form.set("avatarAction", avatarAction);
    if (avatar) form.set("avatar", avatar);
    let response: Response;
    try {
      response = await fetch("/api/profile", {
        method: "PUT",
        headers: { Authorization: `Bearer ${await user.getAccessToken()}` },
        body: form,
        signal: AbortSignal.timeout(45000),
      });
    } catch {
      throw new ProfileSaveError(
        "Your changes weren’t confirmed. Check your connection and try saving again.",
      );
    }
    const data = await response.json();
    if (!response.ok)
      throw new ProfileSaveError(
        data.error || "We couldn’t save your changes.",
        data.errors,
        response.status,
      );
    if (currentUid.current !== user.uid)
      throw new ProfileSaveError(
        "Your account changed. Sign in again to continue.",
        {},
        401,
      );
    const profile = data.profile as SavedProfile;
    let photoURL = state?.uid === user.uid ? state.photoURL : null;
    if (avatar && profile.avatarMode === "custom")
      photoURL = URL.createObjectURL(avatar);
    else if (profile.avatarMode === "google") photoURL = user.photoURL;
    else if (profile.avatarMode === "none") photoURL = null;
    replaceBlob(photoURL?.startsWith("blob:") ? photoURL : null);
    setState({
      uid: user.uid,
      profile,
      photoURL,
      photoError:
        !avatar &&
        avatarAction === "keep" &&
        profile.avatarMode === "custom" &&
        !!state?.photoError,
      error: null,
    });
    return profile;
  }
  const visible = state?.uid === user?.uid ? state : null;
  return (
    <ProfileContext.Provider
      value={{
        profile: visible?.profile ?? null,
        photoURL: visible?.photoURL ?? null,
        photoError: visible?.photoError ?? false,
        loading: authLoading || (!!user && (loading || !visible)),
        error: visible?.error ?? null,
        reload,
        save,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}
export const useProfile = () => useContext(ProfileContext);
