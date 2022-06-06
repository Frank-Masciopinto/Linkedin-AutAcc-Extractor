let LS = {
    getAllItems: () => chrome.storage.local.get(),
    getItem: async key => (await chrome.storage.local.get(key))[key],
    setItem: (key, val) => chrome.storage.local.set({[key]: val}),
    removeItems: keys => chrome.storage.local.remove(keys),
  };
let linked_url = "https://www.linkedin.com";
let api_URL_Company = "https://api.bextra.io/account/insert";
let api_URL_Contact = "https://api.bextra.io/account/insert_contacts";
let api_ERROR_URL = "https://api.bextra.io/error/report";
//let api_linkedin_login_credentials = "https://api.bextra.io/ce/onboard/BEXTEN_AUTO_ACC/" + window.localStorage.getItem("created_by");
let api_get_next_company = "https://api.bextra.io/ce/get_next_account_to_research";
let api_URL_account_has_been_researched = "https://api.bextra.io/account/researched";
let api_APPID_URL = "";
let job_experience_array_new_url;
let automation_extraction_completed = false;
let is_Automation = false;
let process_is_active = false;
let order_index = 1;
let set_back_for_awhile = 1;


chrome.runtime.onInstalled.addListener(async (details) => {
    console.log("ONINSTALL")
    if (details.reason == "install") {
        let today_counter = {
            index: 0,
            accounts: 0,
            contacts: 0,
            failures: 0
        }
        let today_Date = new Date()
        //get_linkedin_login()     // Login into linkedin should be done only after getting the campaign
		await LS.setItem("number_of_pages_to_scroll", 5);
		await LS.setItem("Counters_last_date_checked", today_Date.toString());
		await LS.setItem("Counters", [today_counter]);
		await LS.setItem("memory_auto_list_manual", "OFF");
		await LS.setItem("AutoLIST-ON-OFF-TOGGLE-Position", "OFF");
		await LS.setItem("list_code", "");
    }
});
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.message === "fetch_phone") {  //called from content.js and content_sales_navigator.js
        console.log("chrome.runtime.onMessage.addListener ==> if \"fetch_phone\" ==> One message received", request.payload);
        let fetched_info = await get_Website_email(request.payload.Company_Domain)
        console.log("***********HERE****************")
        console.log(fetched_info)
        request.payload.Extra_phones = fetched_info.Phone
        request.payload.Email = fetched_info.Email
        request.payload.Company_Facebook = fetched_info.facebook
        request.payload.Company_Instagram = fetched_info.instagram
        request.payload.Company_Twitter = fetched_info.twitter
        return true;
    }
    else if (request.message === "Automation_Extracted_ACCOUNT") { //called from content.js
        console.log(request.payload);
        is_Automation = true;
        let fetched_info = await get_Website_email(request.payload.Company_Domain)
        console.log("***********Extracted Company's Email & Phone****************")
        console.log(fetched_info)
        request.payload.Extra_phones = fetched_info.Phone
        request.payload.Email = fetched_info.Email
        request.payload.Company_Facebook = fetched_info.facebook
        request.payload.Company_Instagram = fetched_info.instagram
        request.payload.Company_Twitter = fetched_info.twitter
        call_API_fetch(request.payload, "Company")
        return true;
    } 
    else if (request.message === "Contact Experience Fetched") { //called from content.js
        console.log("chrome.runtime.onMessage.addListener ==> if \"Contact Experience Fetched\" ==> request.all_experience: ", request.all_experience);
        job_experience_array_new_url = request.all_experience
        return true;
    } 
	else if (request.message === "What_are_the_Linkedin_Credentials?") { //called from content.js
        console.log("chrome.runtime.onMessage.addListener ==> if \"What_are_the_Linkedin_Credentials?\" ==> request: ", request);
        sendResponse({
            user: await LS.getItem("userId"),
            password: await LS.getItem("passwd")
        });
        return true;
    } 
	else if (request.message === "AUTOLIST_COMPANY_fetch_phone") { //called from content.js and content_sales_navigator.js
        console.log("chrome.runtime.onMessage.addListener ==> if \"AUTOLIST_COMPANY_fetch_phone\" ==> request: ", request);
        await LS.setItem("AUTOLIST_Company_About_Received", "true")
        if (request.payload.Phone != null || request.payload.Phone != undefined) {
            fetch_Phone(request.payload, true);
        } else {
            fetch_Phone(request.payload, false)
        }
        return true;
    } 
    else if (request.message === "call_API_Contact") { //called from content.js and content_sales_navigator.js
        console.log("chrome.runtime.onMessage.addListener ==> if \"call_API_Contact\" ==> request.payload: ", request.payload);
        if (request.payload.email == "yes") {
            var existCondition = setInterval(async function () {
                //wait for getting email
                if (await LS.getItem("email_found") != null && job_experience_array_new_url != null) {
                    console.log(await LS.getItem("email_found"))
                    clearInterval(existCondition);
                    request.payload.email = await LS.getItem("email_found")
                        request.payload.experience = job_experience_array_new_url
                        console.log(request.payload);
                    inser_Record(request.payload, "Contact")
                    await LS.setItem("email_found", null)
                    job_experience_array_new_url = null
                    return ("All contacts Loaded")
                }
                //All Contacts LISTED
                else {
                    console.log("*********email & Job Experience not fetched yet, in loop...**************")
                }
            }, 1500);
        } else {
            var existCondition = setInterval(async function () {
                //wait for getting email
                if (job_experience_array_new_url != null) {
                    clearInterval(existCondition);
                    request.payload.email = await LS.getItem("email_found")
                    request.payload.experience = job_experience_array_new_url
                    console.log(request.payload);
                    inser_Record(request.payload, "Contact")
                    job_experience_array_new_url = null
                        await LS.setItem("email_found", null)
                        return ("All contacts Loaded")
                }
                //All Contacts LISTED
                else {
                    console.log("*********email & Job Experience not fetched yet, in loop...**************")
                }
            }, 1500);
        }
        return true;
    } 
//    else if (request.message === "how_Many_Pages_to_Scroll?") {	//// No function is calling it
//        let pages = await LS.getItem("number_of_pages_to_scroll")
//        sendResponse({
//            number_Of_Pages: pages
//        });
//        return true;
//    } 
    else if (request.message === "fetched_company_ID") { //called from content.js
        async function update_companyID() {
            await LS.setItem("company_ID", request.company_ID);
        }
        update_companyID()
        return true;
    } 
    else if (request.message === "Connect?") { //called from content.js and content_sales_navigator.js
        if (await LS.getItem("Message_Connect") == "null") {
            console.log("Message for connect is null!")
            sendResponse({
                answer: false
            });
        } else {
            console.log("Message for connect exist below")
            console.log(await LS.getItem("Message_Connect"))
            sendResponse({
                answer: await LS.getItem("Message_Connect"),
                company_Name: await LS.getItem("Company_Name")
            });
        }
        return;
    } 
    else if (request.message === "Company_Page_Not_Found") { //called from content.js
        console.log("chrome.runtime.onMessage.addListener ==> if \"Company_Page_Not_Found\" ==> request.payload: ", request.payload);
        await LS.setItem("AUTOLIST_Company_About_Fetched", "404")
        automation_extraction_completed = "404"
        return true;
    } 
    else if (request.message === "new_AUTO_Contact_Info_Fetched") { //called from content.js
        console.log("chrome.runtime.onMessage.addListener ==> if \"new_AUTO_Contact_Info_Fetched\" ==> request.contact_info: ", request.contact_info)
        if (request.contact_info.email == "yes") {
            var existCondition = setInterval(async function () {
                //wait for getting email
                if (await LS.getItem("email_found") != null && job_experience_array_new_url != null) {
                    clearInterval(existCondition);
                    request.contact_info.email = await LS.getItem("email_found")
                    request.contact_info.experience = job_experience_array_new_url
                    request.contact_info.ce_reg_key = await LS.getItem("ce_reg_key")
                    setTimeout(async function () {
                        call_API_fetch(request.contact_info, "Contact")
                        let list_to_Extract = await LS.getItem('AUTOLIST_Extraction_list')
                        async function check_then_Open_Tab_Next_Employee() {
                            console.log("check_then_Open_Tab_Next_Employee()");
                            while (true) {
                                console.log("Inside While Loop")
                                let leads_to_Check = list_to_Extract[0]
                                if (leads_to_Check != null && leads_to_Check != "") {
                                    console.log("leads_to_Check != null");
                                    console.log(leads_to_Check)
                                    //let check_if_Employee_Was_Already_Extracted = await check_Record_Existance(leads_to_Check, "Contact")
                                    if (list_to_Extract.length == 0 || leads_to_Check.length == 0) {
                                        await LS.setItem("AUTOLIST_All_Employees_for_this_keyword_Extracted", "true")
                                        break
                                    }
                                       
                                    else {
                                        url = list_to_Extract.shift() + "?sin_acc"
                                        console.log(url)
                                        chrome.windows.create({url:url, height:100, width:200})
                                        await LS.setItem('AUTOLIST_Extraction_list', list_to_Extract)
                                        break
                                    }
                                } 
                                else {
                                    console.log("All Employees Extracted Breaking Loop <----XXXXXXXXXXXXX")
                                    await LS.setItem("AUTOLIST_All_Employees_for_this_keyword_Extracted", "true")
                                    break
                                }
                            }
                        }
                        setTimeout(() => {
                            check_then_Open_Tab_Next_Employee()
                        }, 3000)
                        job_experience_array_new_url = null
                    }, 500);
                    return ("All contacts Loaded")
                } 
                else {
                    console.log("Waiting for email...")
                }
            }, 1500);
        } else {
            console.log("request.contact_info.email == no")
            setTimeout(function () {
                inser_Record(request.contact_info, "Contact-Extract-Next")
            }, 500);
        }
        return true;
    } 
    else if (request.message === "email_Info") { //called from content.js
        console.log("chrome.runtime.onMessage.addListener ==> if \"email_Info\" ==> request: ", request);
        if (request.email == null) {
            await LS.setItem("email_found", "Not Found");
        }
        else {
            await LS.setItem("email_found", request.email);
        }
        return true;
    } 
    else if (request.message === "call_API_Contact_extract_Next_Lead") { //called from content.js
        console.log("chrome.runtime.onMessage.addListener ==> if \"call_API_Contact_extract_Next_Lead\" ==> request.contact_info: ", request.contact_info);
        console.log("One message received", request.contact_info)
        if (request.contact_info.email == "yes") {
            var existCondition = setInterval(async function () {
                //wait for getting email
                if (await LS.getItem("email_found") != null && job_experience_array_new_url != null) {
                    console.log(await LS.getItem("email_found"))
                    clearInterval(existCondition);
                    request.contact_info.email = await LS.getItem("email_found")
                        request.contact_info.experience = job_experience_array_new_url
                        setTimeout(function () {
                            inser_Record(request.contact_info, "Contact-Extract-Next")
                        }, 500);
                    return ("All contacts Loaded")
                } else {
                    console.log("Waiting for email...")
                }
            }, 1500);
        } else {
            setTimeout(function () {
                inser_Record(request.contact_info, "Contact-Extract-Next")
            }, 500);
        }
        return true;
    } 
    else if (request.message === "Contact_Enrichment_Already Extracted") { //called from content.js
        console.log("chrome.runtime.onMessage.addListener ==> if \"Contact_Enrichment_Already\" ==> ", request.payload);
        await LS.setItem("Contact-Enrichment-Extracted-and-Sent-to-API", "true")
        return true;
    } 
    else if (request.message === "One_Contact_Enrichment_Extraction_Completed") { //called from content.js
        console.log("chrome.runtime.onMessage.addListener ==> if \"One_Contact_Enrichment_Extraction_Completed\" ==> request.contact_info: ", request.contact_info);
        if (request.contact_info.email == "yes") {
            var existCondition = setInterval(async function () {
                //wait for getting email
                if (await LS.getItem("email_found") != null && job_experience_array_new_url != null) {
                    console.log(await LS.getItem("email_found"))
                    clearInterval(existCondition);
                    request.contact_info.email = await LS.getItem("email_found")
                        request.contact_info.experience = job_experience_array_new_url
                        setTimeout(function () {
                            inser_Record(request.contact_info, "Contact-Enrichment")
                        }, 500);
                    return ("All contacts Loaded")
                } else {
                    console.log("Waiting for email...")
                }
            }, 1500);
        } else {
            setTimeout(function () {
                inser_Record(request.contact_info, "Contact-Extract-Next")
            }, 500);
        }
        return true;
    } 
    else if (request.message === "All_Leads_list") { //called from content.js
        console.log("chrome.runtime.onMessage.addListener ==> if \"All_Leads_list\" ==> request: ", request);
        await LS.setItem("tab_Id_extract_All_function", sender.tab.id)
        console.log("One message received", request.leads_list)
        async function check_then_Open_Tab_Next_Employe() {
            while (true) {
                if (request.leads_list.length != 0) {
                    let leads_to_Check = request.leads_list[0]
                        let check_if_Employee_Was_Already_Extracted = await check_Record_Existance(leads_to_Check, "Contact")
                        if (check_if_Employee_Was_Already_Extracted == false) {
                            request.leads_list.shift()
                            window.open(leads_to_Check + '?extr_id=', "Autolist-Contact", "height=100,width=200", "_blank");
                            await LS.setItem('Extraction_list', request.leads_list)
                            break
                        }
                        //if lead was already extracted, remove it from array and continue loop.
                        else {
                            request.leads_list.shift()
                        }
                } else if (request.leads_list.length == 0) {
                    await LS.setItem('Extraction_list', null)
                    break
                }
            }
        }
        check_then_Open_Tab_Next_Employe()
        return true;
    } 
    else if (request.message === "AUTOLIST_All_Contacts_for_keyword_list") { //called from content.js
        console.log("message: Collected All Employees for Keyword, NEXT is Extraction Employee Data", request.leads_list)
        if (request.leads_list.length < 1) {
            await LS.setItem("AUTOLIST_All_Employees_for_this_keyword_Extracted", "true")
        } 
        else {
            async function check_then_Open_Tab_Next_Employee() {
                while (true) {
                    if (request.leads_list.length != 0) {
                        let leads_to_Check = request.leads_list[0]
                            request.leads_list.shift()
                            url = leads_to_Check + "?sin_acc"
                            console.log(url)
                            chrome.windows.create({url:url, height:100, width:200})
                            await LS.setItem('AUTOLIST_Extraction_list', request.leads_list)
                            break
                    } 
                    else if (request.leads_list.length == 0) {
                        await LS.setItem("AUTOLIST_All_Employees_for_this_keyword_Extracted", "true")
                        break
                    }
                }
            }
            check_then_Open_Tab_Next_Employee()
        }
        return true;
    }
})

//Check how many days have passed for leads counter
async function counter_daily_check() {
    let counters = await LS.getItem("Counters")
    console.log(counters)
    let today_counter = {
        index: counters[counters.length - 1].index + 1,
        accounts: 0,
        contacts: 0,
        failures: 0
    }
    let last_date_checked = new Date(await LS.getItem("Counters_last_date_checked"))
    let oneDay = 86400000
    let today_Date = new Date()
    console.log("Checking if 1 day passed")
    let days_Passed_Since_last_check = Math.round(Math.abs((today_Date - last_date_checked) / oneDay));
    console.log(days_Passed_Since_last_check)
    //If 1 days passed since last check, add new today counter
    if (days_Passed_Since_last_check > 0) {
        counters.push(today_counter)
        await LS.setItem("Counters_last_date_checked", today_Date.toString());
        await LS.setItem("Counters", counters);
    }
    //Delete oldest counter record if more than 7 counters
    if (counters.length > 7) {
        counters.shift()
    }
}
setTimeout(() => {
    counter_daily_check()
}, 250);


//When change tab
/*****************************************************************************************************/
/**	We should inject JS only to a single working tab and not to any linkedin tab 					**/
/*****************************************************************************************************/
chrome.tabs.onActivated.addListener(tab => {
    //Check if Linkedin is in the url
    chrome.tabs.get(tab.tabId, function (tab) {
        if (chrome.runtime.lastError) {
            console.log("Inside runtime error");
        } else {
            setTimeout(() => {
                inject_Js(tab.url, tab.id);
            }, 300);
        }
    });
    function inject_Js(link, tabId) {
        if (link.includes("chrome://") || link.includes("developer.chrome.com") || link.includes("chrome-extension://") || link.includes("chrome-error://") || link.includes("chrome.google.com/webstore") || link.includes("about:") || link.includes("addons.mozilla.org") || link.includes("moz-extension://")) {
            console.log("Inside google chrome")
        } 
        else if (link.includes("linkedin.com/company/")) {
            check_than_Insert_JS("content.js", "linkedin.css", tabId)
        } 
        else if (link.includes("&aut_cont")) {
            check_than_Insert_JS("content.js", "linkedin.css", tabId)
        } 
        else if (link.includes("linkedin.com/sales/")) {
            check_than_Insert_JS("content_sales_Navigator.js", "linkedin.css", tabId)
        } 
        else if (link.includes("linkedin.com/checkpoint/")) {
            check_than_Insert_JS("content.js", "linkedin.css", tabId)
        }
    }
});

//On Every new tab Update
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    //console.log("CHECK HERE: ", changeInfo)
    if (changeInfo.status == "complete") {
        inject_javas();
    }
    function inject_javas() {
        //Check if Linkedin is in the url
        chrome.tabs.get(tabId, function (tab) {
            if (chrome.runtime.lastError) {
                console.log("Inside runtime error");
            } else {
                try {
                    inject_Js(tab.url, tab.id);
                } catch {
                    console.log("Inside tab is  undefined");
                }
            }
        })

        async function inject_Js(link, tabId) {
            if (link.includes("chrome://") || link.includes("chrome-extension://") || link.includes("developer.chrome.com") || link.includes("chrome.google.com/webstore") || link.includes("about:") || link.includes("addons.mozilla.org") || link.includes("moz-extension://")) {
            } 
			else if (link.includes("linkedin.com") && !link.includes("/sales/") && (link.includes("/about/") || link.includes("/people/")) || link.includes("linkedin.com/in/")) {
                console.log("Inside OnUpdate injecting COntent")    
                await LS.setItem("Last Extracted", link);
                await LS.setItem("tab_Injected", tabId);
                check_than_Insert_JS("content.js", "linkedin.css", tabId)
            } 
			else if (link.includes("linkedin.com/company/") && !link.match(/(\/people\/)|(\/events\/)|(\/jobs\/)|(\/posts\/)|(\/about\/)|(\/videos\/)/)) {
                if (await LS.getItem("memory_auto_list_manual") == "ON") {
                    scrape_company_About_and_employees_AUTO(link);
                }
            } 
			else if (link.includes("linkedin.com/checkpoint/")) {
                chrome.tabs.executeScript(tabId, {
                    file: "./script/content.js"
                }, () => {
                    if (chrome.runtime.lastError) {
                        console.log("Inside runtime error");
                    }
                    console.log("Inserted script , no error!!");
                });
            } 
			else if (link.includes("linkedin.com/sales/")) {
                if (await LS.getItem("Last Extracted") != link && (await LS.getItem("memory_auto_list_manual") == "ON") || (await LS.getItem("LIST_MODE_IS_ON?") == "true" && await LS.getItem("AutoLIST-ON-OFF-TOGGLE-Position") == "ON")) {
                    await LS.setItem("Last Extracted", link);
                    await LS.setItem("tab_Injected", tabId);
                    await LS.setItem("inject_next", "true");
                    chrome.tabs.reload(tabId);
                }
				else if (await LS.getItem("inject_next") == "true") {
                    await LS.setItem("inject_next", "false");
                    chrome.tabs.insertCSS(tabId, {
                        file: "./style/linkedin.css"
                    }, () => {
                        if (chrome.runtime.lastError) {
                            console.log("Inside runtime error")
                        }
                    })
                    chrome.tabs.executeScript(tabId, {
                        file: "./script/content_sales_Navigator.js"
                    }, () => {
                        if (chrome.runtime.lastError) {
                            console.log("Inside runtime error");
                        }
                        console.log("Inserted script , no error!!");
                    });
                }
            }
        }
    }
});

//Logging Error to API
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function call_API_ERROR(error_message, line_number) {
    var xhr = new XMLHttpRequest();
    let api_URL;
    if (error_message == "send_app_id") {
        api_URL = api_APPID_URL
    } else {
        api_URL = api_ERROR_URL;
    }
    xhr.open("POST", api_URL);

    xhr.setRequestHeader("Accept", "application/json");
    xhr.setRequestHeader("Content-Type", "application/json");

    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            //If error response
            if (xhr.status.toString().substring(0, 1) != "2") {
                alert(`API CALL ERROR - Response: \n\n ${xhr.response}`)
            }
            //If got a valid response
            else {
                console.log("Error Submitted")
            }
        }
    };
    let api_message;
    if (error_message == "send_app_id") {
        api_message = {
            "appid": chrome.runtime.id
        }

    } else {
        api_message = {
            "product": "Bexten",
            "error_message": error_message,
            "function_name": "Row number " + line_number
        }
    }
    xhr.send(JSON.stringify(api_message));
}
// function to insert scripts by checking if they are already injected first
function check_than_Insert_JS(js_File_Name, css_File_Name, tabId) {
    console.log("check_than_Insert_JS(js_File_Name, css_File_Name, tabId", js_File_Name);

    let content_Message = "are_you_there_content_script?";
		chrome.tabs.sendMessage(tabId, {
			message: content_Message
		}, function (msg) {
			msg = msg || {};
			if (chrome.runtime.lastError) {
                setTimeout(() => {
                    console.log("Inside runtime error, NO SCRIPT IS THERE! ------+++++ new function---> " + js_File_Name);
                    chrome.scripting.insertCSS({
                        target: {tabId: tabId},
                        files: ["./style/" + css_File_Name]
                    }, () => {
                        const lastError = chrome.runtime.lastError;
                        if (lastError) {
                            console.log(lastError)
                        }
                        chrome.scripting.executeScript({
                        target: {tabId: tabId},
                        files: ["./script/" + js_File_Name]
                        });
                    });
                }, 700);
			} else if (msg.status != 'yes') {
				if (css_File_Name != "NO_FILE") {
					chrome.tabs.insertCSS(tabId, {
						file: "./style/" + css_File_Name
					});
				}
				chrome.tabs.executeScript(tabId, {
					file: "./script/" + js_File_Name
				}, result => {
					console.log("No error, inserted, message different than yes");
				});
			} else {
				console.log("already injected js => " + js_File_Name);
			}
		});
}

async function scrape_company_About_and_employees_AUTO(company_url) {
        console.log("Scraping about and employees now!     scrape_company_About_and_employees_AUTO(): " + company_url)
        let keywords = await LS.getItem("Keywords")
        let company_name = company_url.replace(/(https\:\/\/)(\w+)\.linkedin\.com\/company\//i, '').replace(/\//i, '')
        let result_Company_Extraction = await extract_Next_Company_Lead(company_url)
        await LS.setItem("Company_Name", company_name)
        if (result_Company_Extraction == "Fetched") { //update popup counters if fetched
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'Images/128.png',
                title: "Scraped '" + company_name + "' data",
                message: "Done",
                priority: 1
            })
            chrome.runtime.sendMessage({
                message: "Update-Company-Counter"
            })
        }
        //Extract all employees from 1st keyword
        if (keywords != null) {
            let keywords_array = JSON.parse(keywords)
                if (keywords_array[0].key != null) {
                    console.log(keywords_array)
                    let key_length = keywords_array.length
                        for (i = 0; i < key_length; i++) {
                            if (keywords_array[i].send_connect_request == true) {
                                await LS.setItem("Message_Connect", keywords_array[i].msg_template[0].body)
                            } else {
                                await LS.setItem("Message_Connect", null)
                            }
                            chrome.notifications.create({
                                type: 'basic',
                                iconUrl: 'Images/128.png',
                                title: "Getting '" + keywords_array[i].key + "' Employees",
                                message: company_name,
                                priority: 1
                            })
                            await extract_All_Employees_from_Each_Keyword(company_url, keywords_array[i].key, result_Company_Extraction)
                        }
                } else {
                    alert("You Dont have any keywords saved for employees extraction. Update Campaign ID.")
                }
        } else {
            console.log("No Keywords Fetched for your Campaign ID!")
        }
}

async function extract_Next_Company_Lead(lead_json) {
    return new Promise((res, rej) => {
        let url;
        if (typeof lead_json === 'string') {
            url = lead_json
        } else {
            url = lead_json.linkedin_page
        }
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'Images/128.png',
            title: 'Extracting Company Info',
            message: url,
            priority: 1
        })

        window.open(url + '/about/', "autoCompany", "height=100,width=200", "_blank");
        var existCondition = setInterval(async function () {
            //wait for getting email
            if (await LS.getItem("AUTOLIST_Company_About_Fetched") == "true") {
                //                console.log("Company details fetched")
                clearInterval(existCondition);
                await LS.setItem("AUTOLIST_Company_About_Fetched", "false")
                res("Fetched")
            } else if (await LS.getItem("AUTOLIST_Company_About_Fetched") == "404") {
                //                console.log("Company Linkedin page not found")
                await LS.setItem("AUTOLIST_Company_About_Fetched", "false")
                clearInterval(existCondition);
                res("404")
            }
            //All Contacts LISTED
            else {
                console.log("Company details not fetched yet, in loop...")
            }
        }, 3000);
    })
}

async function extract_All_Employees_from_Each_Keyword(lead_json, keyword, result_extract_Company) {
    console.log("extract_All_Employees_from_Each_Keyword()");
    return new Promise((res, rej) => {
        let url;
        if (typeof lead_json === 'string') {
            url = lead_json.match(/^(.*?)linkedin.(\w+)\/(company|school)\/([^/]*)/)[0]
        } 
        else {
            url = lead_json.linkedin_page.match(/^(.*?)linkedin.(\w+)\/(company|school)\/([^/]*)/)[0]
        }
        if (!url.includes("/showcase/") && result_extract_Company == "Fetched") {
            url = url + `/people/?keywords=${keyword}&aut_cont`
            console.log(url)
            chrome.windows.create({url:url, height:100, width:200})

            let check_if_extension_is_stucked = 0
            var existCondition = setInterval(async function () {
                //wait for extracting all employees
                if (await LS.getItem("AUTOLIST_All_Employees_for_this_keyword_Extracted") == "true") {
                    console.log("****--->>>>> All Employees Extracted")
                    clearInterval(existCondition);
                    console.log("All_Employees_for_this_keyword_Extracted");
                    await LS.setItem("AUTOLIST_All_Employees_for_this_keyword_Extracted", "false")
                    res()
                }
                else if (check_if_extension_is_stucked > 50) {
                    clearInterval(existCondition);
                    console.log("***Extension STUCKED... Forcing to continue... ***");
                    res()
                }
                //All Contacts LISTED
                else {
                    check_if_extension_is_stucked++
                    console.log("ALL Employees infos not fetched yet, in loop...");
                }
            }, 6000);
        } 
        else {
            chrome.runtime.sendMessage({
                message: "message_For_Console",
                message_to_display: `No Employees to extract for this company`
            });
            if (result_extract_Company == "404") {
console.log("404 No employees to extract, extracting next company!");
                res()
            } else {
console.log("Link contains Showcase, No employees to extract, extracting next company!");
                res()
            }
        }
    })
}

async function get_Website_email(domain) {
    console.log("inside get Email, website >>> " + domain)
    return new Promise ((res, rej) => {
        let set_emails = new Set;
        let phone_confirmed = new Set;
        let title;
        let company_Facebook;
        let company_Twitter;
        let company_Instagram;
        if (domain != "null") {
        
            const fetch_Response = fetch(domain).then(function(response) {
                return response.text()}).then((txt) => {  
                    let contact_Page_full;
                    try {
                        title = txt.match(/(?<=\<title\>).*?(?=\<)/)[0]
                    }
                    catch {}
                    try {
                        company_Facebook = txt.match(/(?<=href=")https\:\/\/(www.||)facebook.com.*?(?=\")/)[0]
                    } catch {
                        company_Facebook = "Null"
                    }
                    try {
                        company_Twitter = txt.match(/(?<=href=")https\:\/\/(www.||)twitter.com.*?(?=\")/)[0]
                    } catch {
                        company_Twitter = "Null"
                    }
                    try {
                        company_Instagram = txt.match(/(?<=href=")https\:\/\/(www.||)instagram.com.*?(?=\")/)[0]
                    } catch {
                        company_Instagram = "Null"
                    }
                    //defining Contact Page
                    try {
                        let contact_page_href_list = txt.match(/href=(["'])(?:(?=(\\?))\2.)*(contatti|contact|contacts)\1/ig)
                        let contact_Page = contact_page_href_list[0].match(/(?<=href=").*(?=")/)[0]
                        if (!contact_Page.includes("http")) {
                            if (contact_Page.charAt(0) != "/") {
                                contact_Page = "/" + contact_Page
                            }
                            if (domain.slice(-1) != "/") {
                                contact_Page_full = domain + contact_Page
                            }
                            else {
                                console.log("inside else")
                                contact_Page_full = domain + contact_Page.substring(1, contact_Page.length)
                            }
                        }
                        else {
                            contact_Page_full = contact_Page
                        }
                    }
                    catch{contact_Page_full = null}
    
                    let listOfEmails = txt.match(/[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+(\.it|\.biz|\.com|\.net|\.co\.uk|\.fr|\.com\.br|\.de|\.es|\.nl|\.com\.au|\.in|\.ca|\.ru|\.co\.jp|\.be|\.be|\.com\.mx|\.co\.id|\.com\.sg|\.ch|\.net\.au)+/gi);
                    console.log(listOfEmails)
                    if (listOfEmails !== null){
                        listOfEmails.forEach(function(email){
                            if (email == ".@.null" || email.includes("sentry-next.") || email.includes("example.com") || email.includes("youremail") || email.includes("name@")) {}
                            else {set_emails.add(email)}
                        })
                        list_of_emails = Array.from(set_emails)
                        console.log(list_of_emails)
                    }
                    else {
                        list_of_emails = null
                    }
                    console.log("INSIDE PHONE REGEX")
                    phone_n = txt.match(/href=(["'])tel:(?:(?=(\\?))\2.)*\1+/gi)
                    console.log(phone_n)
                    if (phone_n != null){
                        for (let i=0; i<phone_n.length; i++) {
                            phone_confirmed.add(phone_n[i].match(/(?<=href="tel:).*?(?=\")/g)[0])
                        }
                    }
                    else {
                        phone_confirmed = null
                    }
                    // If list of emails is null open contact page
                    if (listOfEmails == null) {
                        const fetch_Response_Contact_Page = fetch(contact_Page_full).then(function(response) {
                            return response.text()}).then((txt) => {
                                let listOfEmails = txt.match(/[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+(\.it|\.biz|\.com|\.net|\.co\.uk|\.fr|\.com\.br|\.de|\.es|\.nl|\.com\.au|\.in|\.ca|\.ru|\.co\.jp|\.be|\.be|\.com\.mx|\.co\.id|\.com\.sg|\.ch|\.net\.au)+/gi);
                                if (listOfEmails !== null){
                                    listOfEmails.forEach(function(email){
                                        if (email == ".@.null" || email.includes("sentry-next.") || email.includes("example.com") || email.includes("youremail") || email.includes("name@")) {}
                                        else {set_emails.add(email)}
                                    })
                                    console.log(set_emails)
                                    list_of_emails = Array.from(set_emails)
                                    console.log("INSIDE PHONE REGEX")
                                    phone_n = txt.match(/href=(["'])tel:(?:(?=(\\?))\2.)*\1+/gi)
                                    console.log(phone_n)
                                    if (phone_n != null){
                                        for (let i=0; i<phone_n.length; i++) {
                                            console.log(phone_n[i])
                                            phone_confirmed.add(phone_n[i].match(/(?<=href="tel:).*?(?=\")/g)[0].replace(";", "; "))
                                        }
                                    }
                                    else {}
                                    let all_phones;
                                    if (all_phones != null) {
                                        all_phones = Array.from(phone_confirmed)
                                    }
                                    else {
                                        all_phones = "N/A"
                                    }
                                    res({phones: all_phones, emails: list_of_emails, instagram: company_Instagram, facebook: company_Facebook, twitter: company_Twitter})

                                }
                                else {
                                    list_of_emails = null
                                    console.log("No emails found on Contact page and home page Found");
                                    res({phones: "N/A", emails: "N/A", instagram: company_Instagram, facebook: company_Facebook, twitter: company_Twitter})
                                }
                                    
                                }).catch((error) => console.log(error), res({phones: "N/A", emails: "N/A", instagram: company_Instagram, facebook: company_Facebook, twitter: company_Twitter})
                                )
                                .then((value) => {
                                    console.log(value)
                                })
                    }
                    else {
                        let all_phones;
                        if (phone_confirmed != null) {
                            all_phones = Array.from(phone_confirmed)
                        }
                        else {
                            all_phones = null
                        }
                        res({phones: all_phones, emails: list_of_emails, instagram: company_Instagram, facebook: company_Facebook, twitter: company_Twitter})

                    }
                }).catch(function(error) {
                    res({phones: "N/A", emails: "N/A"})
                    console.log(error)})
        }
        else {
            res({phones: "N/A", emails: "N/A", instagram: company_Instagram, facebook: company_Facebook, twitter: company_Twitter})
        }
    })
}

async function call_API_fetch(record, company_Or_Contact) {
    console.log("call_API_fetch()")
    console.log(company_Or_Contact)
    //defining right url API
    if (company_Or_Contact == "Company") {
        api_url = api_URL_Company + '/' + await LS.getItem("user_id") + '/' + await LS.getItem("list_code");
    } 
    else if (company_Or_Contact == "Contact-Enrichment") {
        api_url = api_URL_Contact + '/' + await LS.getItem("user_id") + '/' + await LS.getItem("list_code")
    } 
    else {
        api_url = api_URL_Contact + '/' + await LS.getItem("user_id") + '/' + await LS.getItem("list_code")
    }
    //Defining API message
    let api_message;
    function check_NaN(val) {
        if (parseInt(val) != parseInt(val)) {
            return 0;
        }
        return parseInt(val);
    }
    if (company_Or_Contact == "Company") {
        api_message = {
            "name": record.Name,
            "description": record.Description,
            "industry": record.Industry,
            "company_domain": record.Company_Domain,
            "company_size": check_NaN(String(record.Company_size).replace(',', '')),
            "year_founded": record.Year_founded,
            "linkedin_page": record.LinkedIn_page,
            "followers": record.Followers,
            "phone": record.Phone,
            "email": record.Email,
            "logo_filelink": record.Logo,
            "specialties": "null",
            "source": "linkedin",
            "ce_reg_key": await LS.getItem("ce_reg_key"),
            "created_by": await LS.getItem("user_id"),
            "facebookpage": record.Company_Facebook,
            "instagrampage": record.Company_Instagram,
            "twitterpage": record.Company_Twitter,
            "running_code": await LS.getItem("list_code"),
            "linkedin_id": record.company_id,
            "address": [{
                    "full_address": record.Address,
                    "addresstype": ""
                }
            ]
        }
    } 
    else {
        api_message = [
            record
        ]
    }
    fetch(api_url, {
        // Adding method type
        method: "POST",
        body: api_message
    })
    .then((response) => {
        console.log(api_message)
        console.log(response)
        return response})
    .then(async (json) => {
        job_experience_array_new_url = null
        if (is_Automation == true) {
            is_Automation = false
            automation_extraction_completed = true
        }
        await LS.setItem("email_found", null)
        await LS.setItem("company_ID", null)
        let counters = await LS.getItem("Counters")
        if (json.status != 200) {//If error, add it to failures
            counters[counters.length - 1].failures++
            await LS.setItem("Counters", counters);
        }
        else {
            if (company_Or_Contact == "Company") {
                counters[counters.length - 1].accounts++
                await LS.setItem("Counters", counters);
            }
            else {
                counters[counters.length - 1].contacts++
                await LS.setItem("Counters", counters);
            }
        }
    })
}

async function extract_next_employee_Enrichment(url) {
    console.log("extract_next_employee_Enrichment(url): ", url.length);
    return new Promise((res, rej) => {
        window.open(url, "Employees-Enrichment", "height=100,width=200", "_blank");
        let check_when_Employee_Extraction_is_Completed = setInterval(async () => {
            if (await LS.getItem("Contact-Enrichment-Extracted-and-Sent-to-API") == "true") {
                clearInterval(check_when_Employee_Extraction_is_Completed)
                await LS.setItem("Contact-Enrichment-Extracted-and-Sent-to-API", null)
                job_experience_array_new_url = null
                    chrome.runtime.sendMessage({
                        message: "1_Contact_Enrichment_Extracted"
                    })
                    res()
            } else {
                //console.log("***Waiting for confirmation of Contact Enrichment sent to APi***")
            }
        }, 2000);
    })
}

async function call_API_any_company_to_extract() {
    console.log("call_API_any_company_to_extract() ");
	if(await LS.getItem("ce_reg_key") == undefined || await LS.getItem("ce_reg_key")=='') {
		chrome.notifications.create({
            type: 'basic',
            iconUrl: 'Images/128.png',
            title: "Bexten - Please LOG IN First",
            message: "Not Logged In Yet",
            priority: 1
        })
        return;
	}
    fetch(api_get_next_company, {
        // Adding method type
        method: "GET"
    })
    .then(response => response.json())
    .then(async (json) => {
        console.log(json)

            if (json == null) {
                console.log("Server Response Empty, no more company to scrape automatically");
                process_is_active = false;
            }
            //If got a valid response
            else {
                console.log("Valid response")
                await LS.setItem("keywords", JSON.stringify(json[0].keywords));
                let url = json[0].linkedin_page;
                if (!url.match(/\/about/)) {
                    url = url.match(/^(.*?)linkedin.(\w+)\/(company|school)\/([^/]*)/)[0] + "/about"
                }
                url = url + "?aut_acc"
                console.log(url)
                chrome.windows.create({url:url, height:100, width:200})
                await LS.setItem("list_code", json[0].campaign_id)
                let wait_for_company_extract = await extract_company_info()
				set_back_for_awhile += 1;
				if (set_back_for_awhile>=50) {
					set_back_for_awhile = 1;
					let x = (Math.floor((Math.random() * 10) + 1)*60);
                    console.log('****************************** Sleeping for ' + x + ' seconds *******************************');
					await sleep(x);
				}
                if (wait_for_company_extract == "EXTENSION_STUCKED" || wait_for_company_extract == "404") {
                    await update_account_to_be_researched(json[0].campaign_id, json[0].id);
                    call_API_any_company_to_extract()
                }
                else {
                    await extract_all_employees_for_keyword(json[0], json[0].keywords, "Fetched")
                    await update_account_to_be_researched(json[0].campaign_id, json[0].id);
                    call_API_any_company_to_extract()
                }
            }
    });
}

async function update_account_to_be_researched(campaign_id, account_id) {
    return new Promise((res, rej) => {
        let api_URL = api_URL_account_has_been_researched + '/' + campaign_id + '/' + account_id

        fetch(api_URL, {
            // Adding method type
            method: "GET"
        })
        .then((response) => {
            console.log(response)
            
            if (response.status.toString().substring(0, 1) != "2") {
                console.log("API CALL ERROR - update_account_to_be_researched(" + campaign_id + ", " + account_id + ") - Response: \n\n ${xhr.response}");
            }
            //If got a valid response
            else {
                console.log("API CALL SUCCESS - update_account_to_be_researched(" + campaign_id + ", " + account_id + ")");
            }
            res()
        })
    })
}

async function extract_company_info() {
    return new Promise((res, rej) => {
        let check_if_extension_is_stucked = 0
        let wait_for_extraction_completed = setInterval(() => {
            if (automation_extraction_completed == true) {
                clearInterval(wait_for_extraction_completed);
                automation_extraction_completed = false;
                res()
            }
            else if (automation_extraction_completed == "404") {
                res("404")
            }
            else if (check_if_extension_is_stucked > 30) {
                res("EXTENSION_STUCKED")
            }
            else {
                check_if_extension_is_stucked++
            }
        }, 2000);
    })
}
async function extract_all_employees_for_keyword(lead_json, keywords) {
    return new Promise(async (res, rej) => {
        if (keywords != null) {
            console.log(keywords);
            let key_length = keywords.length;
            console.log("there are keywords next loop to extract employee");
            for (let it = 0; it < key_length; it++) {
                if (keywords[it].send_connect_request == true) {
                    await LS.setItem("Message_Connect", keywords[i].msg_template[0].body);
                } 
                else {
                    await LS.setItem("Message_Connect", null);
                }
                await extract_All_Employees_from_Each_Keyword(lead_json, keywords[it].key, "Fetched");
                
            }

            res()
        }
    })
}

//every 30mins ask if there is some company to extract
setInterval(() => {
    if (process_is_active != true) {
        process_is_active = true
            call_API_any_company_to_extract()
    }
}, 1800000);

//setTimeout(() => {call_API_any_company_to_extract()}, 20);