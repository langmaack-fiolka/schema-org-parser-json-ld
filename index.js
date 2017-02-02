const request = require("request");
const himalaya = require('himalaya');
const fs = require('fs');
var JSON = require("JSON");

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
        // console.log(isTagElement(element) + ':' + JSON.stringify(element));
    }
}

function parse(body, demo) {
    // console.log(body.toString());
    var json = himalaya.parse(body.toString());
    var html = getElementOfJsonList(json, 'tagName', 'html');

    if (!demo) {
        var dest = [];
        extractJsonLd(html, dest);

        //remove cdata
        //todo test it
        var temp = JSON.stringify(dest);
        dest = JSON.parse(temp.replace("<![CDATA[", "").replace("]]>", ""));

        return dest;
    } else {
        var jsonld =
            '{' +
            '"@context": "http://schema.org/", ' +
            '"@type": "Movie", ' +
            '"name": "Avatar", ' +
            '"director":' +
            '{"@type": "Person",' +
            '"name": "James Cameron",' +
            '"birthDate": "1954-08-16"}, ' +
            '"genre": "Science fiction",' +
            '"trailer": "../movies/avatar-theatrical-trailer.html"' +
            '}';
        return ([JSON.parse(jsonld)]);
    }
}

function getSchemaFromFile(fileUrl, callback, demo) {
    fs.readFile(fileUrl, 'utf8', function (err, data) {
        if (err) {
            return callback(null, err);
        }
        callback(parse(data));
    });
}

/**
 * @param url the url to be inspected
 * @param callback will be called with two parameters:<br>
 *     <ul>
 *         <li>the json-ld object or null, if nothing was found</li>
 *         <li>an error, if one occurred, else null</li>
 *     </ul>
 */
function getMyBodyFromUri(url, callback, demo) {
    request({
        url: url,
        json: true
    }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            callback(parse(body, demo));
        } else {
            if (url.startsWith('www.')) {
                return getMyBodyFromUri('http://' + url, callback, demo);
            }
            if (error.message.toString().indexOf('getaddrinfo ENOTFOUND') > -1)
                return callback(null, new Error('URL not found!'));
            callback(null, error);
        }
    });
}

module.exports = {
    getJsonLdOfUrl: getMyBodyFromUri,
    getJsonFromFile: getSchemaFromFile,
    simplifyJsonLd: simplifyJson
};
