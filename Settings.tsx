import { React } from "@vendetta/metro/common";
import { Forms } from "@vendetta/ui/components";
import { useProxy } from "@vendetta/storage";
import { storage } from "@vendetta/plugin";

const { FormSection, FormInput, FormText } = Forms;

export default function Settings() {
    useProxy(storage);

    return (
        <FormSection title="View Thread" android_noDivider>
            <FormInput
                title="Thread channel ID"
                placeholder="ID of the channel where the bot creates threads"
                value={storage.threadChannelId}
                onChange={(v: string) => (storage.threadChannelId = v.trim())}
            />
            <FormText style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
                Long-press a message and tap "View thread". Enable Developer Mode, then long-press the channel and use Copy Channel ID.
            </FormText>
        </FormSection>
    );
}
