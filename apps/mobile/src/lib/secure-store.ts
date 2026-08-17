import * as SecureStore from "expo-secure-store";

const chunkSize = 1800;
const secureOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

function countKey(key: string) {
  return `${key}.chunks`;
}

function chunkKey(key: string, index: number) {
  return `${key}.${index}`;
}

async function removeChunks(key: string, count: number) {
  await Promise.all(
    Array.from({ length: count }, (_, index) =>
      SecureStore.deleteItemAsync(chunkKey(key, index)),
    ),
  );
}

export const secureSessionStorage = {
  async getItem(key: string) {
    const storedCount = await SecureStore.getItemAsync(countKey(key));
    if (!storedCount) return null;

    const count = Number(storedCount);
    if (!Number.isInteger(count) || count < 1) return null;

    const chunks = await Promise.all(
      Array.from({ length: count }, (_, index) =>
        SecureStore.getItemAsync(chunkKey(key, index)),
      ),
    );

    if (chunks.some((chunk) => chunk === null)) return null;
    return chunks.join("");
  },

  async setItem(key: string, value: string) {
    const previousCount = Number(
      (await SecureStore.getItemAsync(countKey(key))) ?? "0",
    );
    const chunks = value.match(new RegExp(`.{1,${chunkSize}}`, "gs")) ?? [""];

    await Promise.all(
      chunks.map((chunk, index) =>
        SecureStore.setItemAsync(chunkKey(key, index), chunk, secureOptions),
      ),
    );
    await SecureStore.setItemAsync(
      countKey(key),
      String(chunks.length),
      secureOptions,
    );

    if (previousCount > chunks.length) {
      await Promise.all(
        Array.from(
          { length: previousCount - chunks.length },
          (_, offset) =>
            SecureStore.deleteItemAsync(chunkKey(key, chunks.length + offset)),
        ),
      );
    }
  },

  async removeItem(key: string) {
    const storedCount = await SecureStore.getItemAsync(countKey(key));
    const count = Number(storedCount ?? "0");
    if (Number.isInteger(count) && count > 0) {
      await removeChunks(key, count);
    }
    await SecureStore.deleteItemAsync(countKey(key));
  },
};
