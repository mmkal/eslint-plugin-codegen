/** removes all non-alphanumeric characters and converts to lowercase */
export const simplifyContent = (content: string) => {
  return content.replaceAll(/\W+/g, '').toLowerCase()
}

/**
 * returns true if the simplified versions of the two strings are the same
 * can be useful if you want to know if two large blocks of code are equivalent - note that
 * in theory this could return false positives for totally different inputs, since it ignores
 * all formatting, punctuation, etc. V unlikely that you'll have two different inputs with the
 * exact same letters in the same order, but different meanings.
 */
export const equivalentSimplified = (left: string, right: string) => {
  return simplifyContent(left) === simplifyContent(right)
}
