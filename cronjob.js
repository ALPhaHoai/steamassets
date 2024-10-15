import {CronJob} from "cron";
import SteamUser from "steamutils";
import DiscordUser from "discord-control";
import {sleep} from "steamutils/utils.js";

const botNatriDiscordUser = new DiscordUser(process.env.DISCORD_TOKEN);

let isFetching = false;
export async function initCron() {
  console.log("initCron");

  botNatriDiscordUser.init(function () {
    console.log("discord connected");
    new CronJob(
      "0 */10 * * * *",
      async function () {
        if (isFetching) {
          return;
        }
        await sleep(Math.floor(Math.random() * 60) + 1)
        if (isFetching) {
          return;
        }
        isFetching = true;
        try {
          await fetchSteamAssets();
        } catch (e) {}
        isFetching = false;
      },
      null,
      true,
      "Asia/Ho_Chi_Minh",
    ).start();
  });
}

export async function fetchSteamAssetPrice(asset) {
  if (!asset?.appid || !asset?.market_hash_name) {
    return;
  }
  const price = await SteamUser.getPriceOverview(
    asset.appid,
    asset.market_hash_name,
  );

    console.log(price);

  if (
    price?.success !== true ||
    !price.lowest_price ||
    price.lowest_price === asset.lowest_price
  ) {
    return;
  }

  return {
    _id: asset._id,
    lowest_price: price.lowest_price,
  };
}

async function fetchSteamAssets() {
  const channelId = "877487732283277312";
  const res = await botNatriDiscordUser.sendMessageRequest({
    channelId: channelId,
    content: {
      type: "request_steamassets",
      data: Date.now(),
      limit: 10,
    },
  });
  const assets = res?.data;
  if (!Array.isArray(assets) || !assets.length) {
    return console.log("No assets");
  }

  const data = [];
  async function sendResponse() {
    try {
      const list = data.splice(0, data.length);
      const result = await botNatriDiscordUser.sendMessage({
        channelId: channelId,
        content: JSON.stringify({
          type: "update_steamassets",
          data: list,
        }),
      });
      console.log(result?.id, list.length);
    } catch (e) {}
    await sleep(2000);
  }

  let successCount = 0;
  for (const asset of assets) {
    const result = await fetchSteamAssetPrice(asset);
    if (result) {
      successCount++;
      data.push(result);
      if (data.length > 10) {
        await sendResponse();
      }
    }
  }
  await sendResponse();
  console.log("successCount", successCount);
}
