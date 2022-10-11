import chalk from "chalk";
import { analyzeMetafile, build } from "esbuild";

(async () => {
    try {
        const startTime = Date.now();
        console.info(
            chalk.bold(`🚀 ${chalk.blueBright("unity-cs-action")} Build\n`)
        );

        const result = await build({
            entryPoints: ["./src/main.ts"],
            outfile: "dist/index.js",
            metafile: true,
            bundle: true,
            platform: "node",
            target: ["node16"],
            sourcemap: "external",
            treeShaking: true,
        });

        const analysis = await analyzeMetafile(result.metafile);
        console.info(`📝 Bundle Analysis:${analysis}`);

        console.info(
            `${chalk.bold.green("✔ Bundled successfully!")} (${
                Date.now() - startTime
            }ms)`
        );
    } catch (error) {
        console.error(`🧨 ${chalk.red.bold("Failed:")} ${error.message}`);
        console.debug(`📚 ${chalk.blueBright.bold("Stack:")} ${error.stack}`);
        process.exit(1);
    }
})();