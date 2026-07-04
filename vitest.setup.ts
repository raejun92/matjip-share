import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Node 25의 전역 localStorage 스텁이 jsdom 구현을 가리므로
// 테스트용 in-memory 구현으로 교체한다.
function createMemoryStorage(): Storage {
  let store = new Map<string, string>();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => void store.set(key, String(value)),
    removeItem: (key) => void store.delete(key),
    clear: () => void (store = new Map()),
    key: (index) => [...store.keys()][index] ?? null,
    get length() {
      return store.size;
    },
  };
}

const memoryStorage = createMemoryStorage();
Object.defineProperty(globalThis, "localStorage", {
  value: memoryStorage,
  configurable: true,
});
Object.defineProperty(window, "localStorage", {
  value: memoryStorage,
  configurable: true,
});

// 각 테스트 후 DOM 정리
afterEach(() => {
  cleanup();
});
