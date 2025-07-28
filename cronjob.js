import {CronJob} from "cron";
import SteamUser from "steamutils";
import DiscordUser from "discord-control";
import {sleep} from "steamutils/utils.js";
import {axiosInstance} from "./axiosInstance.js";

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
                } catch (e) {
                }
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
    const assets = await fetchSteamAssetsFromApi()
    if (!Array.isArray(assets) || !assets.length) {
        return console.log("No assets");
    }

    const data = [];

    async function sendResponse(data) {
        if (!data.length) {
            return;
        }
        const assetsToSend = data.splice(0, data.length);
        await sendAssetsToApi(SEND_API, assetsToSend);
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


/**
 * Fetch Steam Assets from the backend.
 * Returns an array of asset objects.
 * Hardcoded to /api/assets (GET).
 *
 * @param {number} limit - (Optional) Limit the number of results (default 10).
 * @returns {Promise<Array>} Array of steam asset objects.
 */
export async function fetchSteamAssetsFromApi(limit = 10) {
    try {
        const response = await axiosInstance.get("/api/assets", {
            params: { limit }
        });
        if (Array.isArray(response.data)) {
            return response.data;
        } else {
            console.error("API did not return an array:", response.data);
            return [];
        }
    } catch (error) {
        console.error("Error fetching steam assets from API:", error);
        return [];
    }
}


/**
 * Send updated Steam assets to the backend (bulk update).
 * Hardcoded to POST /api/assets/update
 *
 * @param {Array} assets - Array of asset objects to send.
 * @returns {Promise<Object|null>} Response data from backend, or null on failure.
 */
export async function sendAssetsToApi(assets) {
    if (!Array.isArray(assets) || !assets.length) return null;
    try {
        const response = await axiosInstance.post("/api/assets/update", {
            data: assets
            // No need for "type": "update_steamassets"
        });
        console.log(
            "POST /api/assets/update sent",
            assets.length,
            "assets. Response:",
            response.status
        );
        return response.data;
    } catch (err) {
        console.error("Error sending assets to API:", err);
        return null;
    }
}
