import { describe, it, expect } from "vitest";
import { formatPersonName } from "./utils";

describe("formatPersonName", () => {
  it("returns first + last when there is no patronymic", () => {
    expect(formatPersonName({ firstName: "Ivan", lastName: "Əliyev", gender: "MALE" }, "az")).toBe(
      "Ivan Əliyev"
    );
  });

  it("appends Latin oğlu for males in az/en", () => {
    expect(
      formatPersonName({ firstName: "Ivan", middleName: "Məmməd", lastName: "Əliyev", gender: "MALE" }, "az")
    ).toBe("Ivan Məmməd oğlu Əliyev");
    expect(
      formatPersonName({ firstName: "Ivan", middleName: "Məmməd", lastName: "Əliyev", gender: "MALE" }, "en")
    ).toBe("Ivan Məmməd oğlu Əliyev");
  });

  it("appends Latin qızı for females in az/en", () => {
    expect(
      formatPersonName({ firstName: "Aynur", middleName: "Məmməd", lastName: "Əliyeva", gender: "FEMALE" }, "en")
    ).toBe("Aynur Məmməd qızı Əliyeva");
  });

  it("appends Cyrillic оглы/кызы in ru", () => {
    expect(
      formatPersonName({ firstName: "Иван", middleName: "Мамед", lastName: "Алиев", gender: "MALE" }, "ru")
    ).toBe("Иван Мамед оглы Алиев");
    expect(
      formatPersonName({ firstName: "Айнур", middleName: "Мамед", lastName: "Алиева", gender: "FEMALE" }, "ru")
    ).toBe("Айнур Мамед кызы Алиева");
  });

  it("does not double the marker when the middle name already has one", () => {
    expect(
      formatPersonName({ firstName: "Ivan", middleName: "Məmməd oğlu", lastName: "Əliyev", gender: "MALE" }, "az")
    ).toBe("Ivan Məmməd oğlu Əliyev");
    expect(
      formatPersonName({ firstName: "Иван", middleName: "Мамед оглы", lastName: "Алиев", gender: "MALE" }, "ru")
    ).toBe("Иван Мамед оглы Алиев");
  });

  it("omits the marker for unknown gender", () => {
    expect(
      formatPersonName({ firstName: "Sam", middleName: "Lee", lastName: "Doe", gender: "OTHER" }, "en")
    ).toBe("Sam Lee Doe");
    expect(formatPersonName({ firstName: "Sam", middleName: "Lee", lastName: "Doe" }, "en")).toBe(
      "Sam Lee Doe"
    );
  });
});
