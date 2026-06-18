import { generateContentWithRetryAndFallback } from './frontend/src/utils/gemini';

(async () => {
    try {
        console.log("Starting test...");
        await generateContentWithRetryAndFallback({
            contents: "test",
            config: {},
            isLegalAnalysis: true
        });
        console.log("Done");
    } catch (e) {
        console.error(e);
    }
})();
