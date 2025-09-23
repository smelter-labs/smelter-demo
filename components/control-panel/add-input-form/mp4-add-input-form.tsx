import { addMP4Input, getMP4Suggestions, Input, MP4Suggestions } from "@/app/actions";
import { useEffect, useState } from "react";
import { GenericAddInputForm } from "./generic-add-input-form";
import { toast } from "react-toastify";

// --- AddMP4InputForm ---
export function Mp4AddInputForm({
    inputs,
    roomId,
    refreshState,
}: {
    inputs: Input[];
    roomId: string;
    refreshState: () => Promise<void>;
}) {
    const [mp4Suggestions, setMp4Suggestions] = useState<MP4Suggestions>({
        mp4s: [],
    });

    useEffect(() => {
        getMP4Suggestions().then(setMp4Suggestions);
    }, []);

    return (
        <GenericAddInputForm<string>
            inputs={inputs}
            roomId={roomId}
            refreshState={refreshState}
            suggestions={mp4Suggestions.mp4s}
            // No filtering, just show all
            placeholder='MP4 URL or select from list'
            onSubmit={async (mp4FileName: string) => {
                if (!mp4FileName) {
                    toast.error('Please enter or select an MP4 URL.');
                    throw new Error('No MP4 URL');
                }
                try {
                    await addMP4Input(roomId, mp4FileName);
                } catch (err) {
                    toast.error(`Failed to add "${mp4FileName}" MP4 input.`);
                    throw err;
                }
            }}
            renderSuggestion={(mp4Url, idx, highlighted) => (
                <>
                    <span className='font-semibold break-all'>{mp4Url}</span>
                    <span className='ml-2 text-white-60 block'>[MP4]</span>
                </>
            )}
            getSuggestionValue={(mp4Url) => mp4Url}
            buttonText='Add MP4'
            loadingText='Add MP4'
            validateInput={(value) =>
                !value ? 'Please enter or select an MP4 URL.' : undefined
            }
        />
    );
}
