import { useEffect, useRef, useState, type RefObject } from 'react';
import { apiFetchJson, getAuthToken } from '@/lib/backendClient';
import { useLanguage, type Language } from '@/lib/language';
import type { Article } from '@/types';

export interface TranslationFields {
  title: string;
  content: string;
  segments: Record<string, string>;
}

interface TranslationResponse {
  success: boolean;
  data: TranslationFields;
}

interface LocalizedArticleResponse {
  id: string;
  title?: string | null;
  subtitle?: string | null;
  summary?: string | null;
  blocks?: Array<{
    id: string;
    type: string;
    text?: string | null;
    caption?: string | null;
    quiz?: {
      questions?: Array<{
        id: string;
        question?: string | null;
        options?: Array<{
          id: string;
          option_text?: string | null;
          explanation?: string | null;
        }>;
      }>;
    };
    opinion?: {
      question?: string | null;
      options?: Array<{ id: string; option_text?: string | null }>;
    };
  }>;
}

interface TranslatedArticleFields extends TranslationFields {
  isLoading: boolean;
  error: string | null;
  ref: RefObject<HTMLDivElement>;
}

interface TranslationState extends TranslationFields {
  isLoading: boolean;
  error: string | null;
  requestKey: string;
}

const translatedFieldCache = new Map<string, string>();
const pendingTranslations = new Map<string, Promise<TranslationFields>>();
const CLIENT_TRANSLATION_URL = 'https://translate.googleapis.com/translate_a/single';

export function getLocalizedArticleFields(article: Article, language: Language) {
  if (language === 'EN') return { title: null, description: null };

  if (article.content_language === language) {
    return {
      title: article.title,
      description: article.subtitle || article.summary || null,
    };
  }

  const languageKey = language.toLowerCase() as 'te' | 'hi';
  const translation = article.translations?.[languageKey];
  const title = translation?.title
    || article[`title_${languageKey}`];
  const description = translation?.subtitle
    || translation?.summary
    || article[`subtitle_${languageKey}`]
    || article[`summary_${languageKey}`]
    || null;

  return {
    title,
    description,
  };
}

export function getLocalizedArticleText(
  article: Article,
  language: Language,
  field: 'title' | 'subtitle' | 'summary',
): string | null {
  if (language === 'EN') return null;
  if (article.content_language === language) {
    const value = article[field];
    return typeof value === 'string' && value.trim() ? value : null;
  }
  const languageKey = language.toLowerCase() as 'te' | 'hi';
  const value = article.translations?.[languageKey]?.[field]
    ?? article[`${field}_${languageKey}`];
  return typeof value === 'string' && value.trim() ? value : null;
}

export function getLocalizedTakeaways(article: Article, language: Language): string[] | null {
  if (language === 'EN') return null;
  const languageKey = language.toLowerCase() as 'te' | 'hi';
  const takeaways = article.translations?.[languageKey]?.key_takeaways
    ?? article[`key_takeaways_${languageKey}`];
  return Array.isArray(takeaways) ? takeaways : null;
}

function fieldCacheKey(
  articleId: string,
  language: Language,
  fieldName: string,
  originalText: string,
) {
  return JSON.stringify([articleId, language, fieldName, originalText]);
}

function languageName(language: Language): string {
  return language === 'TE' ? 'Telugu' : 'Hindi';
}

function protectBrandNames(
  fields: TranslationFields,
  language: Language,
): { fields: TranslationFields; containsBrand: boolean; restore: (translated: TranslationFields) => TranslationFields } {
  const replacements = new Map<string, string>();
  let tokenIndex = 0;
  let containsBrand = false;
  const brandPattern = /\b(The Modern Stories|TMS)\b/gi;

  const protect = (text: string) => text.replace(brandPattern, (brand) => {
    containsBrand = true;
    const token = `ZZQXBRANDTOKEN${tokenIndex++}XQZZ`;
    replacements.set(token, /^TMS$/i.test(brand)
      ? 'TMS'
      : language === 'TE' ? 'ది మోడరన్ స్టోరీస్' : 'द मॉडर्न स्टोरीज');
    return token;
  });

  const protectedFields: TranslationFields = {
    title: protect(fields.title),
    content: protect(fields.content),
    segments: Object.fromEntries(
      Object.entries(fields.segments).map(([key, value]) => [key, protect(value)]),
    ),
  };

  const restoreText = (text: string) => {
    let restored = text;
    for (const [token, brand] of replacements) {
      restored = restored.split(token).join(brand);
    }
    if (/ZZQXBRANDTOKEN\d+XQZZ/.test(restored)) {
      throw new Error('Translation service altered a protected brand token');
    }
    return restored;
  };

  const restoreFields = (translated: TranslationFields): TranslationFields => {
    const translatedValues = [
      translated.title,
      translated.content,
      ...Object.values(translated.segments),
    ];
    for (const token of replacements.keys()) {
      if (!translatedValues.some((value) => value.includes(token))) {
        throw new Error('Translation service omitted a protected brand token');
      }
    }

    return {
      title: restoreText(translated.title),
      content: restoreText(translated.content),
      segments: Object.fromEntries(
        Object.entries(translated.segments).map(([key, value]) => [key, restoreText(value)]),
      ),
    };
  };

  return {
    fields: protectedFields,
    containsBrand,
    restore: restoreFields,
  };
}

function hasAllTranslations(
  source: TranslationFields,
  translated: TranslationFields,
  language: Language,
): boolean {
  const allFieldsPresent = (!source.title || Boolean(translated.title?.trim()))
    && (!source.content || Boolean(translated.content?.trim()))
    && Object.keys(source.segments).every((key) => Boolean(translated.segments[key]?.trim()));
  if (!allFieldsPresent) return false;

  const targetScript = language === 'TE' ? /[\u0C00-\u0C7F]/ : /[\u0900-\u097F]/;
  const pairs: Array<[string, string | undefined]> = [
    ...(source.title ? [[source.title, translated.title] as [string, string | undefined]] : []),
    ...(source.content ? [[source.content, translated.content] as [string, string | undefined]] : []),
    ...Object.entries(source.segments).map(([key, original]) => [original, translated.segments[key]] as [string, string | undefined]),
  ];
  return pairs.every(([original, result]) =>
    targetScript.test(result ?? '')
      || !/[A-Za-z]{3}/.test(
        original.replace(/\b(The Modern Stories|TMS)\b|ZZQXBRANDTOKEN\d+XQZZ/gi, ''),
      ),
  );
}

function detailResponseToTranslation(
  item: LocalizedArticleResponse,
): TranslationFields {
  const segments: Record<string, string> = {};
  for (const block of item.blocks ?? []) {
    const blockId = String(block.id);
    if (block.type === 'TEXT' && typeof block.text === 'string') {
      segments[`block-${blockId}`] = block.text;
    }
    if (block.type === 'IMAGE' && typeof block.caption === 'string') {
      segments[`caption-${blockId}`] = block.caption;
    }
    if (block.type === 'QUIZ' && block.quiz) {
      const firstQuestion = block.quiz.questions?.[0];
      if (firstQuestion?.question) segments[`quiz-question-${blockId}`] = firstQuestion.question;
      for (const question of block.quiz.questions ?? []) {
        if (question.question) segments[`quiz-question-${question.id}`] = question.question;
        for (const option of question.options ?? []) {
          if (option.option_text) segments[`quiz-option-${option.id}`] = option.option_text;
          if (option.explanation) segments[`quiz-explanation-${option.id}`] = option.explanation;
        }
      }
    }
    if (block.type === 'OPINION' && block.opinion) {
      if (block.opinion.question) segments[`opinion-question-${blockId}`] = block.opinion.question;
      for (const option of block.opinion.options ?? []) {
        if (option.option_text) segments[`opinion-option-${option.id}`] = option.option_text;
      }
    }
  }

  return {
    title: typeof item.title === 'string' ? item.title : '',
    content: typeof item.subtitle === 'string'
      ? item.subtitle
      : typeof item.summary === 'string' ? item.summary : '',
    segments: {
      subtitle: typeof item.subtitle === 'string' ? item.subtitle : '',
      summary: typeof item.summary === 'string' ? item.summary : '',
      ...segments,
    },
  };
}

async function fetchLocalizedArticleFallback(
  articleId: string,
  language: Language,
  source: TranslationFields,
): Promise<TranslationFields> {
  const lang = language.toLowerCase();
  let fallbackError: unknown;

  if (await getAuthToken()) {
    try {
      const detail = await apiFetchJson<LocalizedArticleResponse>(
        `/api/v1/articles/${encodeURIComponent(articleId)}?lang=${lang}`,
      );
      const translated = detailResponseToTranslation(detail);
      if (hasAllTranslations(source, translated, language)) return translated;
      fallbackError = new Error('Localized article response omitted requested fields');
    } catch (error) {
      fallbackError = error;
    }
  }

  try {
    const response = await apiFetchJson<{ items?: LocalizedArticleResponse[] }>(
      `/api/v1/articles?article_id=${encodeURIComponent(articleId)}&limit=1&lang=${lang}`,
    );
    const item = response.items?.find((candidate) => String(candidate.id) === articleId);
    if (!item) throw new Error(`No localized article found for ${articleId}`);
    const translated: TranslationFields = {
      title: typeof item.title === 'string' ? item.title : '',
      content: typeof item.subtitle === 'string' ? item.subtitle : item.summary || '',
      segments: {
        subtitle: typeof item.subtitle === 'string' ? item.subtitle : '',
        summary: typeof item.summary === 'string' ? item.summary : '',
      },
    };
    if (hasAllTranslations(source, translated, language)) return translated;
    throw new Error('Localized teaser omitted requested fields');
  } catch (error) {
    console.error(
      `[translation] Both translation API and localized article fallback failed for ${articleId} (${language})`,
      { primaryError: fallbackError, fallbackError: error },
    );
    throw error;
  }
}

function extractGoogleTranslation(payload: unknown): string {
  if (!Array.isArray(payload) || !Array.isArray(payload[0])) {
    throw new Error('Client translation service returned an unexpected response');
  }

  const translatedText = payload[0]
    .filter((part): part is unknown[] => Array.isArray(part))
    .map((part) => (typeof part[0] === 'string' ? part[0] : ''))
    .join('');
  if (!translatedText.trim()) {
    throw new Error('Client translation service returned empty text');
  }
  return translatedText;
}

async function translateWithClientFallback(
  fields: TranslationFields,
  language: Language,
): Promise<TranslationFields> {
  const targetLanguage = language === 'TE' ? 'te' : 'hi';
  const entries: Array<[string, string]> = [
    ...(fields.title ? [['title', fields.title] as [string, string]] : []),
    ...(fields.content ? [['content', fields.content] as [string, string]] : []),
    ...Object.entries(fields.segments).map(([key, value]) => [`segment:${key}`, value] as [string, string]),
  ];
  const translatedEntries: Array<[string, string]> = [];
  const batchSize = 4;

  const translateText = async (text: string): Promise<string> => {
    const chunks: string[] = [];
    let remaining = text;
    while (remaining.length > 3500) {
      let splitAt = remaining.lastIndexOf(' ', 3500);
      if (splitAt < 1000) splitAt = 3500;
      chunks.push(remaining.slice(0, splitAt));
      remaining = remaining.slice(splitAt).trimStart();
    }
    if (remaining) chunks.push(remaining);

    const translatedChunks = await Promise.all(chunks.map(async (chunk) => {
      const params = new URLSearchParams({
        client: 'gtx',
        sl: 'auto',
        tl: targetLanguage,
        dt: 't',
        q: chunk,
      });
      const response = await fetch(`${CLIENT_TRANSLATION_URL}?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Client translation request failed (${response.status})`);
      }
      return extractGoogleTranslation(await response.json());
    }));
    return translatedChunks.join(' ');
  };

  for (let index = 0; index < entries.length; index += batchSize) {
    const batch = entries.slice(index, index + batchSize);
    const results = await Promise.all(batch.map(async ([key, sourceText]) =>
      [key, await translateText(sourceText)] as [string, string],
    ));
    translatedEntries.push(...results);
  }

  const result: TranslationFields = { title: '', content: '', segments: {} };
  for (const [key, value] of translatedEntries) {
    if (key === 'title' || key === 'content') {
      result[key] = value;
    } else {
      result.segments[key.slice('segment:'.length)] = value;
    }
  }

  if (!hasAllTranslations(fields, result, language)) {
    throw new Error('Client translation service returned incomplete translated content');
  }
  return result;
}

export async function translateForManualEditing(
  fields: Pick<TranslationFields, 'title' | 'content'>,
  language: Exclude<Language, 'EN'>,
): Promise<Pick<TranslationFields, 'title' | 'content'>> {
  const sourceFields: TranslationFields = { ...fields, segments: {} };
  const protectedFields = protectBrandNames(sourceFields, language);

  try {
    const response = await apiFetchJson<TranslationResponse>('/api/v1/translate', {
      method: 'POST',
      body: JSON.stringify({
        title: protectedFields.fields.title,
        content: protectedFields.fields.content,
        segments: {},
        targetLang: languageName(language),
      }),
    });
    if (!response.success || !response.data) {
      throw new Error('Translation service returned an invalid response');
    }
    const translated = protectedFields.restore(response.data);
    if (!hasAllTranslations(sourceFields, translated, language)) {
      throw new Error('Translation service returned empty or incomplete translated fields');
    }
    return { title: translated.title, content: translated.content };
  } catch (error) {
    console.warn(`[translation] Admin translation endpoint failed for ${language}; trying client translation`, error);
    const translated = await translateWithClientFallback(protectedFields.fields, language);
    const restored = protectedFields.restore(translated);
    if (!hasAllTranslations(sourceFields, restored, language)) {
      throw new Error('Client translation returned empty or incomplete translated fields');
    }
    return { title: restored.title, content: restored.content };
  }
}

async function requestArticleTranslation(
  articleId: string,
  language: Language,
  fields: TranslationFields,
): Promise<TranslationFields> {
  const signature = JSON.stringify(fields);
  const requestKey = JSON.stringify([articleId, language, signature]);
  const cachedFields: TranslationFields = { title: '', content: '', segments: {} };
  const fieldsToTranslate: TranslationFields = { title: '', content: '', segments: {} };

  for (const fieldName of ['title', 'content'] as const) {
    const originalText = fields[fieldName];
    if (!originalText) continue;
    const key = fieldCacheKey(articleId, language, fieldName, originalText);
    const cached = translatedFieldCache.get(key);
    if (cached !== undefined) cachedFields[fieldName] = cached;
    else fieldsToTranslate[fieldName] = originalText;
  }

  for (const [segmentName, originalText] of Object.entries(fields.segments)) {
    if (!originalText) continue;
    const key = fieldCacheKey(articleId, language, `segment:${segmentName}`, originalText);
    const cached = translatedFieldCache.get(key);
    if (cached !== undefined) cachedFields.segments[segmentName] = cached;
    else fieldsToTranslate.segments[segmentName] = originalText;
  }

  const hasMissingFields = Boolean(
    fieldsToTranslate.title
    || fieldsToTranslate.content
    || Object.keys(fieldsToTranslate.segments).length,
  );

  if (!hasMissingFields) return cachedFields;

  const protectedFields = protectBrandNames(fieldsToTranslate, language);
  let translationPromise = pendingTranslations.get(requestKey);
  if (!translationPromise) {
    translationPromise = apiFetchJson<TranslationResponse>('/api/v1/translate', {
      method: 'POST',
      body: JSON.stringify({
        title: protectedFields.fields.title,
        content: protectedFields.fields.content,
        segments: protectedFields.fields.segments,
        targetLang: languageName(language),
      }),
    }).then((response) => {
      if (!response.success || !response.data) {
        throw new Error('Translation service returned an invalid response');
      }
      const translated = protectedFields.restore(response.data);
      if (!hasAllTranslations(fieldsToTranslate, translated, language)) {
        throw new Error('Translation service returned empty or incomplete translated fields');
      }
      return translated;
    }).catch(async (error: unknown) => {
      console.error(`[translation] POST /api/v1/translate failed for ${articleId} (${language})`, error);
      if (protectedFields.containsBrand) {
        const translated = await translateWithClientFallback(protectedFields.fields, language);
        return protectedFields.restore(translated);
      }
      try {
        const fallback = await fetchLocalizedArticleFallback(articleId, language, fieldsToTranslate);
        return {
          title: fallback.title || '',
          content: fallback.content || '',
          segments: fallback.segments || {},
        };
      } catch (localizedFallbackError) {
        console.warn(
          `[translation] Supabase-backed translation fallback failed for ${articleId} (${language}); trying client translation`,
          localizedFallbackError,
        );
        try {
          return await translateWithClientFallback(fieldsToTranslate, language);
        } catch (clientFallbackError) {
          console.error(
            `[translation] Client translation fallback failed for ${articleId} (${language})`,
            clientFallbackError,
          );
          throw clientFallbackError;
        }
      }
    }).finally(() => {
      pendingTranslations.delete(requestKey);
    });

    pendingTranslations.set(requestKey, translationPromise);
  }

  const translated = await translationPromise;
  if (fieldsToTranslate.title) {
    const key = fieldCacheKey(articleId, language, 'title', fieldsToTranslate.title);
    translatedFieldCache.set(key, translated.title);
    cachedFields.title = translated.title;
  }
  if (fieldsToTranslate.content) {
    const key = fieldCacheKey(articleId, language, 'content', fieldsToTranslate.content);
    translatedFieldCache.set(key, translated.content);
    cachedFields.content = translated.content;
  }
  for (const [segmentName, originalText] of Object.entries(fieldsToTranslate.segments)) {
    const value = translated.segments[segmentName];
    if (typeof value !== 'string') continue;
    const key = fieldCacheKey(articleId, language, `segment:${segmentName}`, originalText);
    translatedFieldCache.set(key, value);
    cachedFields.segments[segmentName] = value;
  }

  return cachedFields;
}

export function useTranslatedArticle(
  articleId: string,
  title: string,
  content: string,
  segments: Record<string, string> = {},
  options: { enabled?: boolean; lazy?: boolean } = {},
): TranslatedArticleFields {
  const { currentLang } = useLanguage();
  const { enabled = true, lazy = false } = options;
  const elementRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(!lazy);
  const fields: TranslationFields = { title, content, segments };
  const fieldsSignature = JSON.stringify(fields);
  const requestKey = JSON.stringify([articleId, currentLang, fieldsSignature]);
  const [translated, setTranslated] = useState<TranslationState>({
    ...fields,
    isLoading: false,
    error: null,
    requestKey: '',
  });

  useEffect(() => {
    if (!lazy) {
      setIsVisible(true);
      return;
    }

    const element = elementRef.current;
    if (!element || typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [lazy]);

  useEffect(() => {
    const sourceFields = JSON.parse(fieldsSignature) as TranslationFields;
    let active = true;

    if (currentLang === 'EN' || !articleId || !enabled || !isVisible) {
      setTranslated({ ...sourceFields, isLoading: false, error: null, requestKey });
      return () => {
        active = false;
      };
    }

    setTranslated({ ...sourceFields, isLoading: true, error: null, requestKey });
    requestArticleTranslation(articleId, currentLang, sourceFields)
      .then((result) => {
        if (!active) return;
        setTranslated({
          title: result.title || sourceFields.title,
          content: result.content || sourceFields.content,
          segments: { ...sourceFields.segments, ...result.segments },
          isLoading: false,
          error: null,
          requestKey,
        });
      })
      .catch((error: unknown) => {
        console.error(`[translation] Could not translate article ${articleId}:`, error);
        const message = error instanceof Error ? error.message : 'Translation failed';
        if (active) setTranslated({ ...sourceFields, isLoading: false, error: message, requestKey });
      });

    return () => {
      active = false;
    };
  }, [articleId, currentLang, enabled, fieldsSignature, isVisible, requestKey]);

  if (currentLang === 'EN' || !enabled || !isVisible) {
    return { ...fields, isLoading: false, error: null, ref: elementRef };
  }

  if (translated.requestKey !== requestKey) {
    return { ...fields, isLoading: true, error: null, ref: elementRef };
  }

  const { requestKey: _requestKey, ...result } = translated;
  return { ...result, ref: elementRef };
}
