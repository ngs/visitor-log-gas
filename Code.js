function onSubmit(e) {
  Logger.log(JSON.stringify(e, null, 2));
  var response = e.response;
  var id = response.getId();
  var timestamp = response.getTimestamp();
  var itemResponses = response.getItemResponses();
  var row = findResponseRow(response);
  var values = row.getValues();
  values[0][8] = id;
  row.setValues(values);
  Logger.log('ID: ' + id + ' Timestamp: ' + timestamp);
  var fields = [];
  var visitorName = 'Unknown';
  for (var i = 0; i < itemResponses.length; i++) {
    var value = itemResponses[i].getResponse();
    var title = itemResponses[i].getItem().getTitle();
    if (title) {
      if (/visitor/i.test(title)) {
        visitorName = value;
      }
      fields.push({
        type: 'mrkdwn',
        text: '*' + title + '*\n\t' + value,
      });
    }
  }
  var text = 'New visitor `' + visitorName + '` was recorded';
  var blocks = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: text,
      },
    },
    {
      type: 'section',
      fields: fields,
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Mark as left',
            emoji: true,
          },
          url: getWebAppURL() + '?id=' + id,
        },
      ],
    },
  ];
  notifySlack({blocks: blocks, text: text});
}

function notifySlack(payload) {
  var url = PropertiesService.getScriptProperties().getProperty(
    'SLACK_WEBHOOK_URL',
  );
  var options = {
    method: 'post',
    headers: {'Content-Type': 'application/json'},
    payload: JSON.stringify(payload),
  };
  var response = UrlFetchApp.fetch(url, options);
  Logger.log(response);
}

function getForm() {
  var formId = PropertiesService.getScriptProperties().getProperty('FORM_ID');
  return FormApp.openById(formId);
}

function getSheet() {
  var worksheetId = PropertiesService.getScriptProperties().getProperty(
    'WORKSHEET_ID',
  );
  return SpreadsheetApp.openById(worksheetId).getSheets()[0];
}

function getWebAppURL() {
  return PropertiesService.getScriptProperties().getProperty('WEBAPP_URL');
}

function findResponseRow(response) {
  var sheet = getSheet();
  if (!response || !sheet) {
    return null;
  }
  var timestamp = response.getTimestamp();
  var rowNum = sheet.getLastRow();
  while (rowNum > 1) {
    var row = sheet.getRange(rowNum, 1, 1, 9);
    var values = row.getValues()[0];
    if (values[0].getTime() === timestamp.getTime()) {
      return row;
    }
    rowNum--;
  }
  return null;
}

function createNotFoundTemplate() {
  return HtmlService.createTemplate(
    '<h1>Not Found</h1><p>Response not found for ID <code><?= id ?></code></p>',
  );
}

function createFormTemplate() {
  var template = HtmlService.createTemplate(
    '<form action="<?= postURL ?>" target="_top" method="POST"><input type="hidden" name="id" value="<?= id ?>"><input type="submit" value="<?= label ?>"></form>',
  );
  template.postURL = getWebAppURL();
  return template;
}

function addMetaTags(output) {
  return output
    .addMetaTag(
      'viewport',
      'width=device-width, initial-scale=1, maximum-scale=1',
    )
    .setTitle('instance0 visitor log');
}

function doGet(e) {
  var form = getForm();
  var id = e.parameter.id;
  var response;
  try {
    response = form.getResponse(id);
  } catch (err) {
    Logger.log(err);
  }
  var row = findResponseRow(response);
  var template;
  if (!row) {
    template = createNotFoundTemplate();
  } else {
    template = createFormTemplate();
    var values = row.getValues();
    if (values[0][7]) {
      template.label = 'Update';
    } else {
      template.label = 'Mark as left';
    }
  }
  template.id = id;
  return addMetaTags(template.evaluate());
}

function doPost(e) {
  var form = getForm();
  var id = e.parameter.id;
  var response;
  try {
    response = form.getResponse(id);
  } catch (err) {
    Logger.log(err);
  }
  var row = findResponseRow(response);
  var template;
  if (!row) {
    template = createNotFoundTemplate();
  } else {
    template = createFormTemplate();
    template.label = 'Update';
    var values = row.getValues();
    values[0][7] = new Date();
    row.setValues(values);
  }
  template.id = id;
  return addMetaTags(template.evaluate());
}
