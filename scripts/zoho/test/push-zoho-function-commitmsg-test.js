const fs = require("fs");
const path = require("path");

const { loadDotEnv } = require("../../../scripts/cli-env");
const { zohoRequest, findFunctionByApiName } = require("../../../zoho-crm-functions");
const { extractFunctionMetadata, resolveDsPath, safeFileName } = require("../../../zoho-function-utils");

function parseArgs(argv) {
  const positional = [];

  for (let i = 2; i < argv.length; i++) {
    const current = argv[i];
    if (current.startsWith("--")) {
      continue;
    }
    positional.push(current);
  }

  return {
    inputName: positional[0] || null,
    codePath: positional[1] || null,
  };
}

async function main() {
  loadDotEnv(path.resolve(".env"));

  const { inputName, codePath } = parseArgs(process.argv);

  if (!inputName) {
    throw new Error(
      "Usage: node push-zoho-function-commitmsg-test.js <function-name> [code.ds]"
    );
  }

  const dsPath = resolveDsPath(inputName, codePath);
  const code = fs.readFileSync(dsPath, "utf8");
  const functionNames = extractFunctionMetadata(code) || {
    category: "Automation",
    displayName: inputName,
    apiName: safeFileName(inputName).toLowerCase(),
  };

  const existing = await findFunctionByApiName(functionNames.apiName);

  if (!existing) {
    throw new Error(`Function "${functionNames.apiName}" does not exist in CRM. This script only tests updates.`);
  }

  const baseFunction = {
    name: functionNames.displayName,
    category: functionNames.category || "Automation",
    runtime: "Deluge 1.0",
    description: "Commit message update probe",
    _code: code,
  };

  const variants = [
    {
      label: "variant-1 extra field commit_msg",
      body: {
        metadata: {
          functions: [baseFunction],
        },
        fields: {
          commit_msg: "TEST: commit message update probe",
        },
      },
      buildForm() {
        const form = new FormData();
        form.append("metadata", JSON.stringify(this.body.metadata));
        form.append("commit_msg", this.body.fields.commit_msg);
        return form;
      },
    },
    {
      label: "variant-2 extra field commit_message",
      body: {
        metadata: {
          functions: [baseFunction],
        },
        fields: {
          commit_message: "TEST: commit message update probe",
        },
      },
      buildForm() {
        const form = new FormData();
        form.append("metadata", JSON.stringify(this.body.metadata));
        form.append("commit_message", this.body.fields.commit_message);
        return form;
      },
    },
    {
      label: "variant-3 metadata.functions[0].commit_msg",
      body: {
        metadata: {
          functions: [
            {
              ...baseFunction,
              commit_msg: "TEST: commit message update probe",
            },
          ],
        },
      },
      buildForm() {
        const form = new FormData();
        form.append("metadata", JSON.stringify(this.body.metadata));
        return form;
      },
    },
    {
      label: "variant-4 metadata.functions[0].commit_message",
      body: {
        metadata: {
          functions: [
            {
              ...baseFunction,
              commit_message: "TEST: commit message update probe",
            },
          ],
        },
      },
      buildForm() {
        const form = new FormData();
        form.append("metadata", JSON.stringify(this.body.metadata));
        return form;
      },
    },
  ];

  for (const variant of variants) {
    const form = variant.buildForm();
    console.log(
      JSON.stringify(
        {
          file: dsPath,
          apiName: functionNames.apiName,
          existingFunctionId: existing.id,
          method: "PUT",
          endpoint: `https://www.zohoapis.eu/crm/v8/settings/functions/${existing.id}`,
          variant: variant.label,
          requestBody: variant.body,
        },
        null,
        2
      )
    );

    try {
      const response = await zohoRequest(`/settings/functions/${existing.id}`, {
        method: "PUT",
        body: form,
      });
      console.log(JSON.stringify(response, null, 2));
    } catch (error) {
      console.log(error.message);
    }
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
