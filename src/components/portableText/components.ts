import CodeSnippet from "./CodeSnippet.astro";
import ImageBlock from "./ImageBlock.astro";
import VideoEmbed from "./VideoEmbed.astro";

export const portableTextComponents = {
  type: {
    imageBlock: ImageBlock,
    videoEmbed: VideoEmbed,
    codeSnippet: CodeSnippet,
  },
};
