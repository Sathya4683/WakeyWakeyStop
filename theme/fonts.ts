export const fontFamilies = {
  regular: "JetBrainsMonoNerd-Regular",
  semiBold: "JetBrainsMonoNerd-SemiBold",
  bold: "JetBrainsMonoNerd-Bold",
  extraBold: "JetBrainsMonoNerd-ExtraBold",
} as const;

export const nerdFontAssets = {
  [fontFamilies.regular]: require("../assets/fonts/JetBrainsMonoNerdFont-Regular.ttf"),
  [fontFamilies.semiBold]: require("../assets/fonts/JetBrainsMonoNerdFont-SemiBold.ttf"),
  [fontFamilies.bold]: require("../assets/fonts/JetBrainsMonoNerdFont-Bold.ttf"),
  [fontFamilies.extraBold]: require("../assets/fonts/JetBrainsMonoNerdFont-ExtraBold.ttf"),
} as const;
