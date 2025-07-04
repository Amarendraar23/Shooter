const { TableClient, AzureNamedKeyCredential } = require("@azure/data-tables");

const account = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
const tableName = "Leaderboard";

const credential = new AzureNamedKeyCredential(account, accountKey);
const tableClient = new TableClient(
  `https://${account}.table.core.windows.net`,
  tableName,
  credential
);

module.exports = async function (context, req) {
  if (req.method === "POST") {
    const { name, score } = req.body;

    if (!name || score == null) {
      context.res = { status: 400, body: "Name and score required" };
      return;
    }

    const entity = {
      partitionKey: "leaderboard",
      rowKey: Date.now().toString(),
      name,
      score
    };

    await tableClient.createEntity(entity);

    context.res = { status: 201, body: "Score saved!" };
  }

  if (req.method === "GET") {
    let entries = [];
    for await (const entity of tableClient.listEntities()) {
      entries.push({ name: entity.name, score: entity.score });
    }

    entries.sort((a, b) => b.score - a.score);
    context.res = {
      status: 200,
      body: entries.slice(0, 10)
    };
  }
};
