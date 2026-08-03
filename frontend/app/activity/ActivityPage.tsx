import React from "react";
import { useAuth } from "../../src/context/AuthContext";
import PageTitle from "../../src/components/PageTitle";
import Feed from "../../src/components/Feed";

const ActivityPage: React.FC = () => {
    const { user } = useAuth();

    return (
        <div className="max-w-4xl mx-auto w-full px-6 py-8">
            <PageTitle title="Activity" />

            <div className="mb-6">
                <h1 className="text-3xl font-extrabold text-[#1f1b2a]">My Activity</h1>
                <p className="text-[#8a8396] text-sm mt-1">
                    View all your posts and interactions
                </p>
            </div>

            <Feed userId={user?.id} showEndOfFeedMessage={false} />
        </div>
    );
};

export default ActivityPage;
