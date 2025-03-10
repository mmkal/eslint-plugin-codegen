module.exports = ({options}) => 'Whole module export with input: ' + options.input
module.exports.getText = ({options}) => 'Named export with input: ' + options.input
module.exports.thrower = () => {
  throw new Error('test error!')
}

/** @type {import('../../src').Preset} */
module.exports.centuryLogStatement = ({cache}) => {
  return cache({maxAge: '100 years'}, () => {
    const century = new Date().getFullYear() >= 2000 ? '21st' : '20th'
    return `console.log('The century is: ${century}')`
  })
}
