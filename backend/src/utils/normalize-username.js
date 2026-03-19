export const normalizeSamAccountName = (input) => {
  const trimmed = input.trim();

  if (trimmed.includes("\\")) {
    const parts = trimmed.split("\\");
    return parts[parts.length - 1].trim();
  }

  if (trimmed.includes("@")) {
    const parts = trimmed.split("@");
    return parts[0].trim();
  }

  return trimmed;
};
