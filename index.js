const request = require("request");
const himalaya = require('himalaya');
const fs = require('fs');
var replaceall = require("replaceall");

const schemaDotOrgLink = 'application/ld+json';

/**
 * returns one element of the json whose tag equals the given parameter
 * @param json the json object
 * @param tagname the tag to be looked up
 * @param parameter the value, that the tag should have
 * @returns {*}
 */
function getElementOfJsonList(json, tagname, parameter) {
    var result = null;
    json.forEach(function (element) {
        if (element[tagname] == parameter)
            result = element;
    });
    return result;
}

var stringConstructor = "test".constructor;
var arrayConstructor = [].constructor;
var objectConstructor = {}.constructor;

/**
 * @param object to be inspected
 * @returns {"null"|undefined"|"String"|"Object"|"don't know"}
 */
function whatIsIt(object) {
    if (object === null) {
        return "null";
    }
    else if (object === undefined) {
        return "undefined";
    }
    else if (object.constructor === stringConstructor) {
        return "String";
    }
    else if (object.constructor === arrayConstructor) {
        return "Array";
    }
    else if (object.constructor === objectConstructor) {
        return "Object";
    }
    else {
        return "don't know";
    }
}

function isInstaceOf(object, string) {
    return whatIsIt(object) === string;
}

/**
 * replaces every '@' symbol with an '_'
 * @param json the json object to be simplified
 * @param res the result json (if not given, it will be defined as {})
 * @returns {{}|*}
 */
function simplifyJson(json, res) {
    res = res ? res : {};
    // console.log('simplify: ' + JSON.stringify(json));
    Object.keys(json).forEach(function (key) {
        var k = key.replace('@', '_');
        // console.log(k + ' --> ' + whatIsIt(json[key]));
        // res[k] = json[key];
        if (whatIsIt(json[key]) === "Object") {
            res[k] = simplifyJson(json[key], res[k]);
        } else {
            res[k] = json[key];
        }
    });
    return res;
}

function isTagElement(json) {
    return json.tagName !== undefined;
}

function isJsonLdSource(element) {
    return element.tagName && element.attributes.type &&
        element.tagName === 'script' && element.attributes.type === schemaDotOrgLink;
}

function extractJsonLd(json, dest) {
    dest = dest ? dest : [];
    for (var i = 0; i < json.children.length; ++i) {
        var element = json.children[i];
        if (isTagElement(element)) {
            if (isJsonLdSource(element))
                dest.push(element);
            if (element.children)
                extractJsonLd(element, dest);
        }
    }
}

function parse(body) {
    const replacements = ['<![CDATA[', ']]>'];
    replacements.forEach(function (str) {
        body = replaceall.replaceall(str, '', body);
    });
    var json = himalaya.parse(body.toString());
    var html = getElementOfJsonList(json, 'tagName', 'html');


    var dest = [];
    extractJsonLd(html, dest);

    dest = JSON.parse(JSON.stringify(dest));

    return dest;
}

/**
 * @param fileUrl the filepath to the html file, that should be inspected
 * @returns {Promise}
 */
function getSchemaFromFile(fileUrl) {
    return new Promise(function (ok, fail) {
        fs.readFile(fileUrl, 'utf8', function (err, data) {
            if (err) {
                return fail(err);
            }
            ok(parse(data));
        });
    });
}

/**
 * @param url the url to be inspected
 * @returns {Promise}
 */
function getMyBodyFromUri(url) {
    return new Promise(function (ok, fail) {
        request({
            url: url,
            json: true
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                ok(parse(body));
            } else {
                const tryHttps = function () {
                    if (!url.startsWith('https://')) {
                        if (url.startsWith('www.'))
                            url = url.substr('www.'.length, url.length);
                        console.log('try https: "' +  ('https://' + url) + '"');
                        return getMyBodyFromUri('https://' + url).then(ok).catch(fail);
                    }

                };
                if (!url.startsWith('www.') && !url.startsWith('http://') && !url.startsWith('https://')) {
                    return getMyBodyFromUri('http://www.' + url).then(ok).catch(tryHttps);
                }
                if (url.startsWith('www.')) {
                    console.log(url);
                    return getMyBodyFromUri('http://' + url).then(ok).catch(tryHttps);
                }
                if (error.message.toString().indexOf('getaddrinfo ENOTFOUND') > -1)
                    return fail(new Error('URL not found!'));
                fail(error);
            }
        });
    });
}

module.exports = {
    getJsonLdOfUrl: getMyBodyFromUri,
    getJsonFromFile: getSchemaFromFile,
    simplifyJsonLd: simplifyJson,
    parseString: parse
};
