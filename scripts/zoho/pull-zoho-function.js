const path = require("path");

const {
  exportAllFunctions,
  exportOneFunction,
  loadDotEnv,
} = require("../../zoho-function-pull-utils");

async function main() {
  loadDotEnv(path.resolve(".env"));

  const inputName = process.argv[2];
  const outputDir = path.resolve("crmFunctions");

  if (!inputName) {
    const exported = await exportAllFunctions(outputDir);
    console.log(JSON.stringify(exported, null, 2));
    return;
  }

  const exported = await exportOneFunction(inputName, outputDir);
  console.log(JSON.stringify(exported, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
