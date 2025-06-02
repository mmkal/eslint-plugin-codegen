/** removes all non-alphanumeric characters and converts to lowercase */
export const simplifyContent = (content: string) => {
  return content.replaceAll(/\W+/g, '').toLowerCase()
}

/**
 * returns true if the simplified versions of the two strings are the same
 * can be useful if you want to know if two large blocks of code are equivalent - note that
 * in theory this could return false positives
 * */
export const equivalentSimplified = (left: string, right: string) => {
  return simplifyContent(left) === simplifyContent(right)
}
