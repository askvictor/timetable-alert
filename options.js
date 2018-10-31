function save_options() {
    var sheet = document.getElementById('sheetID').value;
    var minutes = document.getElementById('minutesInput').value;
    var timetableSource = document.getElementById('timetableSourceChooser').value;
    var calendar = document.getElementById('calendarChooser').value
    chrome.storage.sync.set({
        sheet: sheet,
        minutes: minutes,
        timetableSource : timetableSource,
        calendar: calendar
    }, function() {
        // Update status to let user know options were saved.
        //TODO - check that we can access sheet or calendar, alert user if not
        chrome.extension.getBackgroundPage().clearAndUpdate()
        alert('Options Saved', 'alert-success', 3000)
    });
}

function alert(message, type, timeout=null){
    var status = document.getElementById('status');
    status.hidden = false;
    status.textContent = message;
    status.className = "alert " + type
    if(timeout) {
        setTimeout(function () {
            status.hidden = true;
        }, timeout);
    }

}

function restore_options() {
    chrome.storage.sync.get({
        sheet: 'https://docs.google.com/spreadsheets/d/142DpQazVjW9rSF_AqobM0NWlelqsxsB5cHSTKovZ_8o/edit#gid=0',
        minutes: 5,
        timetableSource: 'spreadsheet',
        calendar: null
    }, function(items) {
        document.getElementById('minutesInput').value= items.minutes;
        document.getElementById('timetableSourceChooser').value= items.timetableSource;
        document.getElementById('sheetID').value = items.sheet;
        get_calendars(items.calendar)
        changeTimetableSource()
    });
}

function changeTimetableSource(){
    switch(document.getElementById('timetableSourceChooser').value){
        case 'spreadsheet':
            document.getElementById('sheetID').disabled = false
            document.getElementById('calendarChooser').disabled = true
            document.getElementById('sheet').style.display = "block"
            document.getElementById('calendar').style.display = "none"
            break
        case 'calendar':
            document.getElementById('sheetID').disabled = true
            document.getElementById('calendarChooser').disabled = false
            document.getElementById('sheet').style.display = "none"
            document.getElementById('calendar').style.display = "block"
            break
    }

}

function get_calendars(currentCalendar){
    chrome.identity.getAuthToken({ interactive: true }, function(token) {
        let init = {
            method: 'GET',
            async: true,
            headers: {
                Authorization: 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            'contentType': 'json'
        };
        fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=250&showHidden=true', init)
            .then((response) => response.json())
            .then(function (data) {
                let calSelect = document.getElementById('calendarChooser')
                let calIDs = []
                let compassCal = null
                data["items"].forEach(function (cal) {
                    let calOption = document.createElement("option");
                    calOption.textContent = cal['summary'];
                    calOption.value = cal['id'];
                    calSelect.appendChild(calOption)

                    calIDs.push(cal['id'])
                    if (cal['summary'].startsWith("Compass Schedule")) {
                        compassCal = cal['id']
                    }
                });
                if(currentCalendar){
                    if(calIDs.includes(currentCalendar)) {
                        calSelect.value = currentCalendar
                    }
                    else{  //calendar from storage doesn't exist - delete it from storage
                        chrome.storage.sync.remove('calendar')
                        calSelect.value = compassCal
                    }
                }else{
                    calSelect.value = compassCal
                }
            })
    })
}

document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);
document.getElementById('reset').addEventListener('click', restore_options);
document.getElementById('timetableSourceChooser').addEventListener('change', changeTimetableSource);