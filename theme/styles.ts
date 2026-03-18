// theme/styles.ts

import { StyleSheet } from "react-native";

export const baseStyles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },

  // 🔲 Card
  card: {
    borderWidth: 3,
    padding: 16,
    marginBottom: 16,
  },

  // 🔘 Button
  button: {
    borderWidth: 3,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
  },

  buttonText: {
    fontWeight: "900",
    fontSize: 16,
  },

  // 📝 Text
  text: {
    fontWeight: "700",
    fontSize: 16,
  },

  title: {
    fontWeight: "900",
    fontSize: 24,
    marginBottom: 12,
  },

  // 📦 Input
  input: {
    borderWidth: 3,
    padding: 12,
    marginBottom: 12,
  },
});

// 🔥 Hard shadow (neo-brutal style)
export const brutalShadow = {
  shadowOffset: { width: 4, height: 4 },
  shadowOpacity: 1,
  shadowRadius: 0,
  elevation: 4,
};
