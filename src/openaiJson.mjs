export function outputText(response) {
  if (response.output_text) return response.output_text;

  return response.output
    ?.flatMap((item) => item.content ?? [])
    ?.map((content) => content.text ?? '')
    ?.join('\n')
    ?.trim();
}

export function parseJsonResponse(response, label) {
  const text = outputText(response);
  if (!text) throw new Error(`OpenAI returned an empty ${label} response.`);

  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error(`OpenAI ${label} response did not contain JSON.`);
    return JSON.parse(match[0]);
  }
}
