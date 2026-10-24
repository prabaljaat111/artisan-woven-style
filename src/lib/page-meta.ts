export function adminPageMeta(section: string) {
  const title = `${section} · Admin — Indian Handicraft Standards`;
  const description = `${section} administration for Indian Handicraft Standards.`;
  return [
    { title },
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex,nofollow" },
  ];
}