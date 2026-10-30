<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";

import { storeToRefs } from "pinia";

import { monaco } from "./monaco";

import { DEV_CANVAS_LANGUAGE, registerFlowgioLanguage } from "./flowgioLanguage";

import { MONACO_THEMES, registerMonacoThemes } from "@/features/theme/monacoThemes";

import { useThemeStore } from "@/stores/theme";

const props = defineProps<{
  modelValue: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

let editor: monaco.editor.IStandaloneCodeEditor | null = null;

const rootRef = ref<HTMLElement | null>(null);

const themeStore = useThemeStore();
const { theme } = storeToRefs(themeStore);

onMounted(() => {
  if (!rootRef.value) {
    return;
  }

  registerFlowgioLanguage();
  registerMonacoThemes();

  editor = monaco.editor.create(rootRef.value, {
    value: props.modelValue,

    language: DEV_CANVAS_LANGUAGE,

    theme: MONACO_THEMES[theme.value],

    automaticLayout: true,

    minimap: {
      enabled: false,
    },

    fontSize: 14,

    padding: {
      top: 16,
      bottom: 16,
    },

    lineNumbers: "on",

    scrollBeyondLastLine: false,

    wordWrap: "on",

    tabSize: 2,

    renderWhitespace: "selection",
  });

  editor.onDidChangeModelContent(() => {
    emit("update:modelValue", editor?.getValue() ?? "");
  });
});

watch(
  () => props.modelValue,
  (value) => {
    if (!editor) {
      return;
    }

    if (editor.getValue() === value) {
      return;
    }

    editor.setValue(value);
  },
);

watch(theme, (value) => {
  monaco.editor.setTheme(MONACO_THEMES[value]);
});

onBeforeUnmount(() => {
  editor?.dispose();
  editor = null;
});
</script>

<template>
  <div ref="rootRef" class="code-editor" />
</template>

<style scoped>
.code-editor {
  width: 100%;
  height: 100%;
}
</style>
