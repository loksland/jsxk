#! /usr/bin/env node

const fs = require('fs');
const path = require('path');
const open = require('open');

const JSX_JSONPOLYFILL_PATH = path.join(__dirname,'jsx','json2.js');
const THROW_ERROR_IF_VAR_NOT_FOUND = true;

const jsxk = {}

jsxk.defaultOptions = {targetProcess:null, timeout:60};
jsxk.options = {};

jsxk.exec = function(jsxFilePath, vars, callback){
  
  let options = Object.assign({}, jsxk.defaultOptions, jsxk.options);
  
  if (!fs.existsSync(jsxFilePath) || fs.statSync(jsxFilePath).isDirectory()){
    throw new Error('Invalid jsxFilePath `'+jsxFilePath+'`');
  }
  
  let jsxSrc;
  try {
    jsxSrc = fs.readFileSync(jsxFilePath, 'utf8');
  } catch (err) {
    throw err;
  }
  
  let tmpJsxFilePath;
  let c = 0;
  while (true){
    const pathParts = jsxFilePath.split('.');
    pathParts.splice(pathParts.length-1, 0, 'working' + pad(c,3));
    tmpJsxFilePath = pathParts.join('.');
    c++;
    if (!fs.existsSync(tmpJsxFilePath)){
      break;
    }
  }
  
  // Inject variables into temp file
  
  let tmpJsxSrc = jsxk.inject(jsxSrc, vars);
  
  try {
    fs.writeFileSync(tmpJsxFilePath, tmpJsxSrc, 'utf8');
  } catch (err) {
    throw err;
  }
  
  if (!fs.existsSync(tmpJsxFilePath)){
    throw new Error('Unable to create `'+tmpJsxFilePath+'`');
  }
  
  // options.wait = true;
  if (options.targetProcess){
    options.app = jsxk.targetProcess; // 'Adobe Photoshop 2020';
  }
  
  const psdExec = open(tmpJsxFilePath, options);
  
  const checkForCompletion = new Promise(function(resolve, reject){
    
    const CHECK_FILE_INTERVAL_MS = 50;
    const TIMEOUT_MS = options.timeout*1000;
    
    let totalTime = 0;
    let checkInterval = setInterval(function(){
      
      totalTime += CHECK_FILE_INTERVAL_MS;
      if (fs.existsSync(tmpJsxFilePath)){
        
        let fileContents;
        try {
          fileContents = fs.readFileSync(tmpJsxFilePath, 'utf8');
        } catch (err) {
          // Failed to read contents
          return reject(err);
        }
        
        if (fileContents.split('__jsxkResultIN').length == 2){
          
          clearInterval(checkInterval);
      
          let data;
          try {
            let jsonRaw = fileContents.split('__jsxkResultIN')[1].split('__jsxkResultOUT')[0];
            data = JSON.parse(jsonRaw);
          } catch (err) {
            // Failed to parse
            return reject(err);
          }
          
          return resolve(data);
          
        } else {
          
          if (totalTime > TIMEOUT_MS){
            clearInterval(checkInterval);
            return reject(new Error('JSX Script time out reached ('+String(Math.round(TIMEOUT_MS*10)/10)+'secs)'));
          }
          
        }
        
      } else {
        return reject(new Error('Temp file not found.'))
      }
      
    }, CHECK_FILE_INTERVAL_MS);
    
  });

  const deleteTempFile = function(){
  
    return new Promise(function(resolve, reject){
      
      try {
        fs.unlinkSync(tmpJsxFilePath);
      } catch (err) {
        return reject(err);
      }
      if (fs.existsSync(tmpJsxFilePath)){
        return reject(new Error('Failed to delete temp file'));
      }
      return resolve();
    });
    
  }
  
  let chain = Promise.all([psdExec,checkForCompletion]).then(function(data){    
  
    return deleteTempFile().then(function(){      
      return data[1];
    })    
    
  }).catch(function(err){
    
    const throwError = function(delFileErr){
      return new Promise(function(resolve, reject){
        return reject(err ? err : (delFileErr ? delFileErr : new Error('Unspecified error')));
      });
    }
    
    // Attempt to delete the temp file, throw the error always
    return deleteTempFile().then(throwError, throwError);
    
  });
  
  if (callback){
    
    chain.then(
      function(data) {
        callback(null, data);
      },
      function(err) {
        callback(err);
      }
    )
    
  } else {
    
    return chain;
    
  }
  
}

jsxk.inject = function(jsxSrc, vars){
  
  for (let varName in vars){
    
    const regex = new RegExp('^[^\S\r\n]*((?:var|const|let) '+escapeRegExp(varName)+'[^\S\r\n]*=[^\S\r\n]*?)(.*)$', 'mi'); // Find first variable declaration, case insensitive
    let m;
    if ((m = regex.exec(jsxSrc)) !== null) {
      jsxSrc = jsxSrc.substr(0, m.index) + m[1] + JSON.stringify(vars[varName]) + ';' + jsxSrc.substr(m.index+m[0].length)
    } else if (THROW_ERROR_IF_VAR_NOT_FOUND){
      throw new Error('Variable `'+varName+'` not found in JSX src.')
    }
    
  }
  
  // Add JSON
  
  if (!fs.existsSync(JSX_JSONPOLYFILL_PATH)){
    throw new Error('Invalid JSX_JSONPOLYFILL_PATH `'+JSX_JSONPOLYFILL_PATH+'`');
  }
  let jsxJSONPolyfillSrc;
  try {
    jsxJSONPolyfillSrc = fs.readFileSync(JSX_JSONPOLYFILL_PATH, 'utf8');
  } catch (err) {
    throw err;
  }
  
  // Add completion
  
  jsxSrc += `
  
  // jsxk.js - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  
function jsxOnComplete(data){
  
  `+jsxJSONPolyfillSrc+`
  
  data = typeof data !== 'undefined' ? data : {};
  // Write result as JSON string appended to bottom of this script.
  var f = File($.fileName);
  f.encoding = "UTF-8";
  f.lineFeed = "Unix";
  f.open("a");
  f.writeln('/'+'*__'+'jsxkResultIN' + JSON.stringify(data) + '__'+'jsxkResultOUT*'+'/');
  f.close();

}
`;
  
  // Add callback if it hasn't been made yet
  
  if (jsxSrc.split('jsxOnComplete').length == 2){
    jsxSrc += '\jsxOnComplete();\n';
  }
  
  return jsxSrc;
  
}

module.exports = jsxk;

// Utils 
// ----- 

const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}


function pad(num, charNum){  
  
  var str = String(num);
  var len = charNum-str.length;
  for (var i = 0; i < len; i++){
    str = '0' + str;
  }
  return str;
  
}


