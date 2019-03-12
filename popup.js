function showAlarms(){
    let alarmslist = document.getElementById("alarms")
    chrome.alarms.getAll(function(alarms){
        alarms.forEach(function(alarm){
            var p = document.createElement("p");
            if(alarm.name != 'daily') {
                let name = alarm.name.split(":", 1)[0]
                var b = document.createElement("b")
                b.appendChild(document.createTextNode(name + " " ))
                p.appendChild(b)
                p.appendChild(document.createTextNode(  (new Date(alarm.scheduledTime)).toLocaleString()));
                alarmslist.appendChild(p);
            }
        })
        if(alarmslist.childElementCount == 1){  //only heading is there; ignore the whole div
            alarmslist.hidden = true;
        }
    })
}

function showToggle(){
    var checkboxGlobal = document.getElementById('switch-global');
    var checkboxToday = document.getElementById('switch-today');
    chrome.storage.local.get({globalEnable: true, disableUntil: 0}, function(result){
        checkboxGlobal.checked = result['globalEnable']
        toggleTextGlobal(checkboxGlobal.checked)
        if(Date.now() > result['disableUntil']) {
            checkboxToday.checked = true
            toggleTextToday(true)
        }else{
            checkboxToday.checked = false
            toggleTextToday(false)
        }
    })
}

function checkAndToggleAlarms(){
    var switchGlobalStatus = document.getElementById('switch-global').checked
    var switchTodayStatus = document.getElementById('switch-today').checked
    if(switchGlobalStatus && switchTodayStatus) {
        document.getElementById('alarms').style.textDecoration = ''
    } else {
        document.getElementById('alarms').style.textDecoration = 'line-through'
    }
}

function toggleTextToday(checked){
    var checkboxLabel= document.getElementById('switch-today-label')
    if(checked){
        checkboxLabel.textContent = "On (click to disable for rest of today)"
    }else{
        checkboxLabel.textContent = "Off for rest of day (click to re-enable)"
    }
    checkAndToggleAlarms()
}

function toggleTextGlobal(checked){
    var checkboxLabel = document.getElementById('switch-global-label');
    var todaySpan= document.getElementById('switch-today-span')
    if(checked){
        checkboxLabel.textContent = "On (click to turn off)"
        todaySpan.style.display = 'inline'
    }else{
        checkboxLabel.textContent = "Off (click to turn on)"
        todaySpan.style.display = 'none'
    }
    checkAndToggleAlarms()
}

function toggleGlobal(){
  var checkbox = document.getElementById('switch-global');
  chrome.storage.local.set({globalEnable: checkbox.checked})
  toggleTextGlobal(checkbox.checked)
}

function toggleToday(){
    var checkbox = document.getElementById('switch-today');
    if(checkbox.checked) {
        chrome.storage.local.set({disableUntil: 0})
    }else{
        var tonight = new Date();
        tonight.setHours(24, 0, 0, 0);
        chrome.storage.local.set({disableUntil: tonight.getTime()})

    }
    toggleTextToday(checkbox.checked)
}


document.addEventListener('DOMContentLoaded', showAlarms);
document.addEventListener('DOMContentLoaded', showToggle);
document.getElementById('switch-global').addEventListener('change', toggleGlobal)
document.getElementById('switch-today').addEventListener('change', toggleToday)
document.getElementById('settingsButton').addEventListener('click', function(){chrome.runtime.openOptionsPage()});
