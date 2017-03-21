'use strict';

module.exports = {

    /* Object Helpers */
    getObjectByName: function(project, name) {
        let foundObject = {};

        project.data.objects.forEach(function(object){
            if(object.name == name) 
                foundObject = object;
        });

        return foundObject;
    },

    /* Input Helpers*/
    isTextField: function(field) {
        return (field.component == 'text' || field.component == 'password' || field.component == 'email');
    },

    isNumberField: function(field) {
        return (field.component == 'number');
    },

    isTextAreaField: function(field) {
        return (field.component == 'textarea');
    },

    isFileField: function(field) {
        return (field.component == 'file');
    },

    isFileImageField: function(field) {
        return (field.component == 'file-image');
    },

    getFieldHTMLTag: function(field) {
        if(this.isTextField(field) || this.isNumberField(field) || this.isTextAreaField(field)){
            return field.component;
        }else
        if(this.isFileField(field) || this.isFileImageField(field)){
            return 'file';
        }
    },

    /* Code Helpers */
    getTemplateCode: function(content, templateName, manipulatorCallback) {
        let startTemplate = 'PwTemplate:' + templateName,
            endTemplate = 'PwEndTemplate',
            template = this.getCodeBetween(content, startTemplate, endTemplate);

        if(manipulatorCallback) template = manipulatorCallback(template);

        return template;
    },

    setTemplateSectionCode: function(content, templateSectionName, replacement) {
        let startTemplateSection = 'PwTemplateSection:' + templateSectionName,
            endTemplateSection = 'PwEndTemplateSection';

        return this.replaceCodeFromTo(content, startTemplateSection, endTemplateSection, replacement);
    },

    removeTemplates: function(content, templates) {
        templates.forEach((templateName) => {
            let startTemplate = 'PwTemplate:' + templateName,
                endTemplate = 'PwEndTemplate';

            content = this.replaceCodeFromTo(content, startTemplate, endTemplate, '');
        });

        return content;
    },

    getCodeBetween: function(content, word1, word2) {
        var re = new RegExp("(?:"+word1+")([^]*?)(?:"+word2+")", "ig"),
            reExec = re.exec(content);
        
        if (reExec && reExec.length > 1) {
            return reExec[1];
        }
        
        return '';
    },

    replaceCode: function(content, variable, replacement) {
        var re = new RegExp('{%' + variable + '%}', 'g');
        return content.replace(re, replacement);
    },

    replaceCodeFromTo: function(content, from, to, replacement) {
        var re = new RegExp("(?:"+from+")([^]*?)(?:"+to+")", "ig");
        return content.replace(re, replacement);
    },

    replaceObjectDefaultCode: function(code, object) {
        code = this.replaceCode(code, 'object', object.name_singular);
        code = this.replaceCode(code, 'Object', this.capitalize(object.name_singular));
        code = this.replaceCode(code, 'objects', object.name);
        code = this.replaceCode(code, 'Objects', this.capitalize(object.name));
        return code;
    },

    replaceFieldDefaultCode: function(code, field) {
        code = this.replaceCode(code, 'field', field.name);
        code = this.replaceCode(code, 'Field', this.capitalize(field.name));
        code = this.replaceCode(code, 'fieldType', this.getFieldHTMLTag(field));
        return code;
    },

    forEachCode: function(content, blockName, items, manipulatorCallback, blockDefaultReplacement) {
        let startEachBlock = 'PwEach:' + blockName,
            endEachBlock = 'PwEndEach',
            eachBlock = this.getCodeBetween(content, startEachBlock, endEachBlock),
            code = '', actualBlockCode = '';

        items.forEach((item) => {
            actualBlockCode = eachBlock;

            if(!blockDefaultReplacement)
                actualBlockCode = this.replaceObjectDefaultCode(eachBlock, item);

            if(manipulatorCallback) 
                actualBlockCode = manipulatorCallback(actualBlockCode, item);

            code += actualBlockCode.replace(/\s+$/g, ''); // Replace last \n - New Line
        });

        content = this.replaceCodeFromTo(content, startEachBlock, endEachBlock, code);

        return content;
    },

    getReplacementCode: function(variable) {
        return new RegExp('{%' + variable + '%}', 'g');
    },

    objectFieldsAsString: function(object) {
        var fields = [];
        
        object.structure.forEach(function(field){
            fields.push('\'' + field.name + '\'');
        });

        return fields.join(',');
    },

    capitalize: function(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    },

    camelize: function(string) {
      return string.replace(/(?:^\w|[A-Z]|\b\w)/g, function(letter, index) {
        return index == 0 ? letter.toLowerCase() : letter.toUpperCase();
      }).replace(/\s+/g, '');
    },

    /* Directory and Files Helpers */
    outputDirectory: function(project, subDirectory) {
        subDirectory = (subDirectory) ? '/' + subDirectory : '';
        return (project.output_directory || './projects') + '/' + project.name + subDirectory;
    },

    copyFolder: function(sourceDir, destinyDir, successCallback) {
        var fileCopy = require('ncp').ncp;

        fileCopy(sourceDir, destinyDir, function(err){
            if(err) throw err;
            console.log(destinyDir,' - Folder Created!!');
            if(successCallback) successCallback();
        })
    },

    makeDirectory: function(path, successCallback) {
        var fs = require('fs');
        fs.mkdir(path, function(err, data) {
            if (err) throw err;
            console.log('Directory',path,'created!');
            if(successCallback) successCallback();
        });
    },

    /*
     * With this method, you can create a new file using a base file. And, if you need, you can manipulate
     * the data of the base file before save the destination file
     */
    fileFromBaseFile: function(baseFile, destFile, manipulatorCallback) {
        this.readFile(baseFile, (textData) => {
            if(manipulatorCallback) 
                textData = manipulatorCallback(textData);

            this.writeFile(destFile, textData);
        });
    },

    fileFromBaseFileWithDefault: function(baseFile, destFile, object) {
        this.readFile(baseFile, (textData) => {
            textData = this.replaceObjectDefaultCode(textData, object);
            this.writeFile(destFile, textData);
        });
    },

    readFile: function(filePath, successCallback) {
        var fs = require('fs');
        fs.readFile(filePath, 'utf-8', function(err, data) {
            if (err) throw err;
            if(successCallback) successCallback(data);
        });
    },

    writeFile: function(filePath, content, successCallback) {
        var fs = require('fs');
        
        fs.writeFile(filePath, content, function(err) {
            if (err) throw err;
            console.log('File ' + filePath +  ' created!');
            if(successCallback) successCallback();
        })
    },

    replaceInFiles: function(files, variable, replacement) {
        var replace = require('replace-in-file');
        const options = {};

        options.files = files;
        options.allowEmptyPaths = false;
        options.replace = this.getReplacementCode(variable);
        options.with = replacement;

        replace.sync(options);
    }
}