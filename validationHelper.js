// Custom Name Validator
const isName = (name) => {
    const regex = new RegExp('(?![ 0-9_])[a-zA-Z0-9 ]{2,20}');
    return regex.test(name);
}

module.exports = { isName };