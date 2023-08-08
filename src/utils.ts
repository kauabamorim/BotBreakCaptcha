export function onlyNumbers(value: string) {
    return value ? value.replace(/[^\d]/g, "") : "";
}