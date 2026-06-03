export const dynamic = "force-dynamic";

import ContestClientComponent from "@/components/ContestClientComponent";
import Navbar from "@/components/Navbar";
import { getContests } from "@/lib/getContests";

export default async function BookmarksPage() {
    const contests = await getContests();

    return (
        <div className="bg-gray-300 dark:bg-black min-h-screen font-sans">
            <div className="container mx-auto p-4 md:p-8">
                <Navbar />
                <header className="text-center mb-8">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-800 dark:text-white mb-3 mt-7">
                        Bookmarked Contests
                    </h1>
                </header>

                <ContestClientComponent
                    initialContests={contests}
                    showFilters={true}
                    bookmarksOnly={true}
                />

            </div>
        </div>
    );
}