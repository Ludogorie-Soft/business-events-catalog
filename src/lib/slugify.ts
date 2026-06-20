export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[àáâãäå]/g, "a")
    .replace(/[èéêë]/g, "e")
    .replace(/[ìíîï]/g, "i")
    .replace(/[òóôõö]/g, "o")
    .replace(/[ùúûü]/g, "u")
    .replace(/[ñ]/g, "n")
    .replace(/[ç]/g, "c")
    // Bulgarian transliteration
    .replace(/[аА]/g, "a").replace(/[бБ]/g, "b").replace(/[вВ]/g, "v")
    .replace(/[гГ]/g, "g").replace(/[дД]/g, "d").replace(/[еЕ]/g, "e")
    .replace(/[жЖ]/g, "zh").replace(/[зЗ]/g, "z").replace(/[иИ]/g, "i")
    .replace(/[йЙ]/g, "y").replace(/[кК]/g, "k").replace(/[лЛ]/g, "l")
    .replace(/[мМ]/g, "m").replace(/[нН]/g, "n").replace(/[оО]/g, "o")
    .replace(/[пП]/g, "p").replace(/[рР]/g, "r").replace(/[сС]/g, "s")
    .replace(/[тТ]/g, "t").replace(/[уУ]/g, "u").replace(/[фФ]/g, "f")
    .replace(/[хХ]/g, "h").replace(/[цЦ]/g, "ts").replace(/[чЧ]/g, "ch")
    .replace(/[шШ]/g, "sh").replace(/[щЩ]/g, "sht").replace(/[ъЪ]/g, "a")
    .replace(/[ьЬ]/g, "").replace(/[юЮ]/g, "yu").replace(/[яЯ]/g, "ya")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

export function uniqueSlug(base: string, suffix?: string): string {
  const s = slugify(base);
  return suffix ? `${s}-${suffix}` : s;
}
