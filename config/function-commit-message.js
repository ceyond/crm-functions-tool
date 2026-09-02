const AUTHOR_NAME = "xxxx";
const COMMIT_PREFIX = `${AUTHOR_NAME}:`;

function buildCommitMessage(action, functionName, changeSummary = "") {
  const trimmedSummary = String(changeSummary || "").trim();

  if (trimmedSummary) {
    return `${COMMIT_PREFIX} ${trimmedSummary}`;
  }

  return `${COMMIT_PREFIX} Updated function implementation`;
}

module.exports = {
  AUTHOR_NAME,
  COMMIT_PREFIX,
  buildCommitMessage,
};
