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


const storageCache = {};

chrome.storage.onChanged.addListener((changes, area) => {
	if(area === "sync") {
		chrome.storage.sync.get(null, (data) => {
		  Object.assign(storageCache, data);
		});
	}
	else if(area === "local") {
		chrome.storage.local.get(null, (data) => {
		  Object.assign(storageCache, data);
		});
	}
});

chrome.runtime.onInstalled.addListener(async (details) => {
    if (details.reason == "install") {
        //get_linkedin_login()     // Login into linkedin should be done only after getting the campaign
		await LS.setItem("number_of_pages_to_scroll", 5);
		await LS.setItem("memory_auto_list_manual", "OFF");
		await LS.setItem("AutoLIST-ON-OFF-TOGGLE-Position", "OFF");
		await LS.setItem("list_code", "");
		
//        window.localStorage.setItem("Linkedin_Leads_Count", 0)
//        window.localStorage.setItem("number_of_pages_to_scroll", "5")
//        window.localStorage.setItem("memory_auto_list_manual", "OFF")
//        window.localStorage.setItem("AutoLIST-ON-OFF-TOGGLE-Position", "OFF")
//        window.localStorage.setItem("Messages", "")
//        window.localStorage.setItem("list_code", "")
       //get_linkedin_login()
        //alert("Please add now your User Id and Running Id by clicking the extension button")
    }
	else if(details.reason == "update") {
		chrome.storage.sync.get(null, (data) => {
		  Object.assign(storageCache, data);
		});
		chrome.storage.local.get(null, (data) => {
		  Object.assign(storageCache, data);
		});
	}

});


chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.message === "fetch_phone") {
        console.log("chrome.runtime.onMessage.addListener ==> if \"fetch_phone\" ==> One message received", request.payload);
        fetch_Phone(request.payload, true);
        let fetched_info = await get_Website_email(request.payload.Company_Domain)
        console.log("***********HERE****************")
        console.log(fetched_info)
        request.payload.Extra_phones = fetched_info.Phone
        request.payload.Email = fetched_info.Email
        return true;
    }
    else if (request.message === "Automation_Extracted_ACCOUNT") {
        console.log(request.payload);
        is_Automation = true;
        let fetched_info = await get_Website_email(request.payload.Company_Domain)
        console.log("***********Extracted Company's Email & Phone****************")
        console.log(fetched_info)
        request.payload.Extra_phones = fetched_info.Phone
        request.payload.Email = fetched_info.Email
        call_API_fetch(request.payload, "Company")
        return true;
    } 
    else if (request.message === "Contact Experience Fetched") {
        console.log("chrome.runtime.onMessage.addListener ==> if \"Contact Experience Fetched\" ==> request.all_experience: ", request.all_experience);
        job_experience_array_new_url = request.all_experience
        return true;
    } else if (request.message === "What_are_the_Linkedin_Credentials?") {
        console.log("chrome.runtime.onMessage.addListener ==> if \"What_are_the_Linkedin_Credentials?\" ==> request: ", request);
        sendResponse({
            user: await LS.getItem("userId"),
            password: await LS.getItem("passwd")
        });
        return true;
    } else if (request.message === "AUTOLIST_COMPANY_fetch_phone") {
        console.log("chrome.runtime.onMessage.addListener ==> if \"AUTOLIST_COMPANY_fetch_phone\" ==> request: ", request);
        await LS.setItem("AUTOLIST_Company_About_Received", "true")
        if (request.payload.Phone != null || request.payload.Phone != undefined) {
            fetch_Phone(request.payload, true);
        } else {
            fetch_Phone(request.payload, false)
        }
        return true;
    } 
    else if (request.message === "call_API_Contact") {
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
    else if (request.message === "how_Many_Pages_to_Scroll?") {
        let pages = await LS.getItem("number_of_pages_to_scroll")
        sendResponse({
            number_Of_Pages: pages
        });
        return true;
    } 
    else if (request.message === "fetched_company_ID") {
        async function update_companyID() {
            await LS.setItem("company_ID", request.company_ID);
        }
        update_companyID()
        return true;
    } 
    else if (request.message === "Connect?") {
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
    else if (request.message === "Company_Page_Not_Found") {
        console.log("chrome.runtime.onMessage.addListener ==> if \"Company_Page_Not_Found\" ==> request.payload: ", request.payload);
        await LS.setItem("AUTOLIST_Company_About_Fetched", "404")
        automation_extraction_completed = "404"
        return true;
    } 
    else if (request.message === "is_List_Mode_On?") {
        if (await LS.getItem("LIST_MODE_IS_ON?") == "true") {
            sendResponse({answer: "true"});
        } else {
            sendResponse({answer: "false"});
        }
        return true;
    } 
    else if (request.message === "scrape_All_Accounts_AUTOMATICALLY") {
        console.log("chrome.runtime.onMessage.addListener ==> if \"scrape_All_Accounts_AUTOMATICALLY\" ==> request.all_accounts: ", request.all_accounts);
        scrape_all_accounts_AUTOMATIC(request.all_accounts)
        await LS.setItem("LIST_MODE_IS_ON?", "true")
        return true;
    } 
    else if (request.message === "new_AUTO_Contact_Info_Fetched") {
        console.log("chrome.runtime.onMessage.addListener ==> if \"new_AUTO_Contact_Info_Fetched\" ==> request.contact_info: ", request.contact_info)
        if (request.contact_info.email == "yes") {
            var existCondition = setInterval(async function () {
                //wait for getting email
                if (await LS.getItem("email_found") != null && job_experience_array_new_url != null) {
                    clearInterval(existCondition);
                    request.contact_info.email = await LS.getItem("email_found")
                    request.contact_info.experience = job_experience_array_new_url
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
    else if (request.message === "API_contacts_process_message") {
        console.log("chrome.runtime.onMessage.addListener ==> if \"API_contacts_process_message\" ==> request: ", request);
        await LS.setItem("API_contacts_auto_enrichment_is_on?", "true")
        console.log(request.all_contacts)
        enrich_contacts_by_li_profile(request.all_contacts);
        return true;
    } 
    else if (request.message === "email_Info") {
        console.log("chrome.runtime.onMessage.addListener ==> if \"email_Info\" ==> request: ", request);
        if (request.email == null) {
            await LS.setItem("email_found", "Not Found");
        }
        else {
            await LS.setItem("email_found", request.email);
        }
        return true;
    } 
    else if (request.message === "STOP_LIST_SCRAPING") {
        console.log("chrome.runtime.onMessage.addListener ==> if \"STOP_LIST_SCRAPING\" ==> request: ", request);
        await LS.setItem("LIST_MODE_IS_ON?", "false")
        chrome.runtime.reload()
    } 
    else if (request.message === "call_API_Contact_extract_Next_Lead") {
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
    else if (request.message === "Contact_Enrichment_Already Extracted") {
        console.log("chrome.runtime.onMessage.addListener ==> if \"Contact_Enrichment_Already\" ==> ", request.payload);
        await LS.setItem("Contact-Enrichment-Extracted-and-Sent-to-API", "true")
        return true;
    } 
    else if (request.message === "One_Contact_Enrichment_Extraction_Completed") {
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
    else if (request.message === "All_Leads_list") {
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
    else if (request.message === "All_Employees_enrichment_mode") {
        console.log("chrome.runtime.onMessage.addListener ==> if \"All_Employees_enrichment_mode\" ==> request: ", request);
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
    else if (request.message === "AUTOLIST_All_Contacts_for_keyword_list") {
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


//When change tab
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
                        return notify(lastError);
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
async function scrape_all_accounts_AUTOMATIC(companies_List_from_API) {
    console.log('scrape_all_accounts_AUTOMATIC(companies_List_from_API)', companies_List_from_API.length);
        let total_companies = companies_List_from_API.length;
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'Images/128.png',
            title: 'Scrapping ' + total_companies + ' Automatic',
            message: 'Starting',
            priority: 1
        })
        let scraped_company_Total = 0;
        for (let i = 0; i < companies_List_from_API.length; i++) { //10
            let clean_url = companies_List_from_API[i].linkedin_page.match(/^(.*?)linkedin.(\w+)\/(company|school)\/([^/]*)/)[0];
            // let check_if_Already_Extracted = await check_Record_Existance(clean_url, "Company");
            // if (check_if_Already_Extracted == false) {
                let keywords = await LS.getItem("Keywords");
                chrome.runtime.sendMessage({
                    message: "message_For_Console",
                    message_to_display: `Extracting: ${companies_List_from_API[i].linkedin_page}`
                })
                let result_Company_Extraction = await extract_Next_Company_Lead(clean_url);
                if (result_Company_Extraction == "Fetched") { //update popup counters if fetched
                    scraped_company_Total += 1;
                    add_Company_scraped_to_Database(clean_url);
                    chrome.runtime.sendMessage({
                        message: "Update-Company-Counter"
                    })
                    if (keywords != null) {
                        let keywords_array = JSON.parse(keywords);
                        console.log(keywords_array);
                        let key_length = keywords_array.length;
                        console.log("there are keywords next loop to extract employee");
                        for (let it = 0; it < key_length; it++) {
                            if (companies_List_from_API[i].send_connect_request == true) {
                                await LS.setItem("Message_Connect", keywords_array[i].msg_template[0].body);
                            } else {
                                await LS.setItem("Message_Connect", null);
                            }
                            await extract_All_Employees_from_Each_Keyword(companies_List_from_API[i], keywords_array[i].key, result_Company_Extraction);
                        }
                    }
                }
                if (i == companies_List_from_API.length - 1) {
                    await LS.setItem("API-processed-Accounts", "0");
                    await LS.setItem("API-processed-Companies", "0");
                }
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'Images/128.png',
                    title: 'Scraped ' + scraped_company_Total + ' Companies',
                    message: 'From total of: ' + companies_List_from_API.length,
                    priority: 1
                })
           // }
        }
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'Images/128.png',
            title: 'Automatic Scrapping is Finished',
            message: 'Scraped ' + scraped_company_Total + ' out of ' + companies_List_from_API.length + ' Companies',
            priority: 1
        })
        await LS.setItem("LIST_MODE_IS_ON?", "false")
    };

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

async function extract_contact_to_enrich(lead_json) {
    console.log("extract_contact_to_enrich(lead_json)", lead_json);
    return new Promise((res, rej) => {
        let url;
        if (typeof lead_json === 'string') {
            url = lead_json.match(/^(.*?)linkedin.(\w+)\/in\/([^/]*)/)[0]
        } else {
            url = lead_json.linkedin_page.match(/^(.*?)linkedin.(\w+)\/in\/([^/]*)/)[0]
        }
        if (!url.includes("/showcase/") && result_extract_Company == "Fetched") {
            window.open(url, "AllEmployeesExtraction", "height=100,width=200", "_blank");

            var existCondition = setInterval(async function () {
                //wait for getting email
                if (await LS.getItem("AUTOLIST_All_Employees_for_this_keyword_Extracted") == "true") {
                    clearInterval(existCondition);
                    console.log("All_Employees_for_this_keyword_Extracted")
                    await LS.setItem("AUTOLIST_All_Employees_for_this_keyword_Extracted", "false")
                    res()
                }
                //All Contacts LISTED
                else {
                    console.log("ALL Employees infos not fetched yet, in loop...")
                }
            }, 6000);
        } else {
            chrome.runtime.sendMessage({
                message: "message_For_Console",
                message_to_display: `No Employees to extract for this company`
            })
            if (result_extract_Company == "404") {
                console.log("404 No employees to extract, extracting next company!")
                res()
            } else {
                console.log("Link contains Showcase, No employees to extract, extracting next company!")
                res()
            }
        }
    })
}
function fetch_Phone(lead_Info, phone_Bool) {
    return new Promise(async (resolve, reject) => {
        //Search for company Phone on website
        let company_Phone;
        console.log(lead_Info.Company_Domain)
        let phone_n;
        if (lead_Info.Company_Domain != "null") {
            const fetch_Response = fetch(lead_Info.Company_Domain).then(function (response) {
                if (!response.ok) {
                    reject()
                }
                return response.text()
            }).then(async (text) => {
                let parser = new DOMParser();
                let doc = parser.parseFromString(text, "text/html")
                    //fetch social media links
                    let company_Facebook;
                let company_Twitter;
                let company_Instagram;
                let email;
                try {
                    company_Facebook = doc.querySelector("a[href^='https://www.facebook.com/']").href
                } catch {
                    company_Facebook = "Null"
                }
                try {
                    company_Twitter = doc.querySelector("a[href^='https://twitter.com/']").href
                } catch {
                    company_Twitter = "Null"
                }
                try {
                    company_Instagram = doc.querySelector("a[href^='https://www.instagram.com/']").href
                } catch {
                    company_Instagram = "Null"
                }
                lead_Info.Company_Facebook = company_Facebook
                lead_Info.Company_Instagram = company_Instagram
                lead_Info.company_Twitter = company_Twitter
                    try {
                        var container = doc.querySelector('a[href^="mailto:"]')
                            email = (container.href).substring(7);
                        email = email.replace("%20", "")
                            if (phone_Bool == false) {
                                let phone_confirmed;
                                phone_n = doc.querySelector('a[href ^= "tel:"]')
                                    if (phone_n != null) {
                                        console.log(phone_n.href.substring(4))
                                        phone_confirmed = phone_n.href.substring(4)
                                    } else {
                                        try {
                                            console.log("INSIDE PHONE REGEX")
                                            phone_n = text.match(/([(+]{1,2}[\d]{3}([) ]|[-]|[)]){1}[\d]{3}([-. ])?[\d]{4})|(([(]|[(+]){0,2}[\d]{1,3}[) -]{1,2}(([\d]{7,10})|([\d]{3,4}[ -\.][\d]{6,7}))|((\d){3}[-]{1}(\d){3})[-]{1}[\d]{3,4})+/)
                                                if (phone_n != null) {
                                                    phone_confirmed = phone_n[0]
                                                }
                                        } catch {
                                            console.log("NO PHONE FOUND WITH REGEX")
                                            phone_confirmed = "Null"
                                        }
                                    }
                                    lead_Info.Phone = phone_confirmed
                            }
                            lead_Info.Email = email
                            //If auto confirm toggle is OFF, ask for confirmation
                            if (await LS.getItem("auto-confirmation-ON-OFF-TOGGLE") == "OFF" && await LS.getItem("auto-confirmation-LIST-MODE") == "OFF" && await LS.getItem("auto-confirmation-LIST-CONTACTS-MODE") == "OFF") {
                                var r = confirm(`Leads Information Below, Confirm Please\n\nName: ${lead_Info.Name}\nIndustry: ${lead_Info.Industry}\nCompany_Domain: ${lead_Info.Company_Domain}\nCompany Size: ${lead_Info.Company_size}\nAddress: ${lead_Info.Address}\nYear Founded: ${lead_Info.Year_founded}\nFollowers: ${lead_Info.Followers}\nPhone: ${lead_Info.Phone}\nEmail: ${lead_Info.Email}\nCompany Full Address: ${lead_Info.Company_Street_Address}\nFacebook Page: ${lead_Info.Company_Facebook}\nInstagram Page: ${lead_Info.Company_Instagram}\nTwitter Page: ${lead_Info.Company_Twitter}\nDescription: ${lead_Info.Description}`);
                                if (r == true) {
                                    inser_Record(lead_Info, "Company")
                                } else {}
                            } else {
                                inser_Record(lead_Info, "Company")
                            }
                    } catch {

                    var contentText = text
                        listOfEmails = contentText.match(/[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+(\.it|\.biz|\.com|\.net|\.co\.uk|\.fr|\.com\.br|\.de|\.es|\.nl|\.com\.au|\.in|\.ca|\.ru|\.co\.jp|\.be|\.be|\.com\.mx|\.co|\.id|\.com|\.sg|\.ch|\.net\.au)+/gi);
                    if (listOfEmails !== null) {
                        listOfEmails.forEach(function (email0) {
                            if (email0 == ".@.null" || email0.includes("sentry-next.") || email0.includes("example.com") || email0.includes("youremail") || email0.includes("name@")) {}
                            else {
                                email = email0
                            }
                        })
                    } else {
                        email = "null"
                    }
                    if (phone_Bool == false) {
                        let phone_confirmed;
                        phone_n = doc.querySelector('a[href ^= "tel:"]')
                            if (phone_n != null) {
                                console.log(phone_n.href.substring(4))
                                phone_confirmed = phone_n.href.substring(4)
                            } else {
                                try {
                                    console.log("INSIDE PHONE REGEX")
                                    phone_n = text.match(/([(+]{1,2}[\d]{3}([) ]|[-]|[)]){1}[\d]{3}([-. ])?[\d]{4})|(([(]|[(+]){0,2}[\d]{1,3}[) -]{1,2}(([\d]{7,10})|([\d]{3,4}[ -\.][\d]{6,7}))|((\d){3}[-]{1}(\d){3})[-]{1}[\d]{3,4})+/)
                                        if (phone_n != null) {
                                            phone_confirmed = phone_n[0]
                                        }
                                } catch {
                                    console.log("NO PHONE FOUND WITH REGEX")
                                    phone_confirmed = "null"
                                }
                            }
                            lead_Info.Phone = phone_confirmed
                    }
                    lead_Info.Email = email
                        //If auto confirm toggle is OFF, ask for confirmation
                        if (await LS.getItem("auto-confirmation-ON-OFF-TOGGLE") == "OFF" && await LS.getItem("auto-confirmation-LIST-MODE") == "OFF" && await LS.getItem("auto-confirmation-LIST-CONTACTS-MODE") == "OFF") {
                            var r = confirm(`Leads Information Below, Confirm Please\n\nName: ${lead_Info.Name}\nIndustry: ${lead_Info.Industry}\nCompany_Domain: ${lead_Info.Company_Domain}\nCompany Size: ${lead_Info.Company_size}\nAddress: ${lead_Info.Address}\nYear Founded: ${lead_Info.Year_founded}\nFollowers: ${lead_Info.Followers}\nPhone: ${lead_Info.Phone}\nEmail: ${lead_Info.Email}\nCompany Full Address: ${lead_Info.Company_Street_Address}\nFacebook Page: ${lead_Info.Company_Facebook}\nInstagram Page: ${lead_Info.Company_Instagram}\nTwitter Page: ${lead_Info.Company_Twitter}\nDescription: ${lead_Info.Description}`);
                            if (r == true) {
                                inser_Record(lead_Info, "Company")
                            } else {}
                        } else {
                            inser_Record(lead_Info, "Company")
                        }
                }
            }).catch(async function (error) {
                console.log(error);
                if (await LS.getItem("auto-confirmation-ON-OFF-TOGGLE") == "OFF" && await LS.getItem("auto-confirmation-LIST-MODE") == "OFF" && await LS.getItem("auto-confirmation-LIST-CONTACTS-MODE") == "OFF") {
                    var r = confirm(`Leads Information Below, Confirm Please\n\nName: ${lead_Info.Name}\nIndustry: ${lead_Info.Industry}\nCompany_Domain: ${lead_Info.Company_Domain}\nCompany Size: ${lead_Info.Company_size}\nAddress: ${lead_Info.Address}\nYear Founded: ${lead_Info.Year_founded}\nFollowers: ${lead_Info.Followers}\nPhone: ${lead_Info.Phone}\nEmail: ${lead_Info.Email}\nCompany Full Address: ${lead_Info.Company_Street_Address}\nFacebook Page: ${lead_Info.Company_Facebook}\nInstagram Page: ${lead_Info.Company_Instagram}\nTwitter Page: ${lead_Info.Company_Twitter}\nDescription: ${lead_Info.Description}`);
                    if (r == true) {
                        inser_Record(lead_Info, "Company")
                    } else {}
                } else {
                    inser_Record(lead_Info, "Company")
                }
                reject()
            });
        } 
        else {
            if (await LS.getItem("auto-confirmation-ON-OFF-TOGGLE") == "OFF" && await LS.getItem("auto-confirmation-LIST-MODE") == "OFF" && await LS.getItem("auto-confirmation-LIST-CONTACTS-MODE") == "OFF") {
                var r = confirm(`Leads Information Below, Confirm Please\n\nName: ${lead_Info.Name}\nIndustry: ${lead_Info.Industry}\nCompany_Domain: ${lead_Info.Company_Domain}\nCompany Size: ${lead_Info.Company_size}\nAddress: ${lead_Info.Address}\nYear Founded: ${lead_Info.Year_founded}\nFollowers: ${lead_Info.Followers}\nPhone: ${lead_Info.Phone}\nEmail: ${lead_Info.Email}\nCompany Full Address: ${lead_Info.Company_Street_Address}\nFacebook Page: ${lead_Info.Company_Facebook}\nInstagram Page: ${lead_Info.Company_Instagram}\nTwitter Page: ${lead_Info.Company_Twitter}\nDescription: ${lead_Info.Description}`);
                if (r == true) {
                    inser_Record(lead_Info, "Company")
                } else {}
            } else {
                inser_Record(lead_Info, "Company")
            }
        }
        resolve()
    }).catch((error) => {
        inser_Record(lead_Info, "Company")
        console.log("FETCH ERROR CATCHED")
        reject()
    })
}

async function get_Website_email(domain) {
    console.log("inside get Email, website >>> " + domain)
    return new Promise ((res, rej) => {
        let set_emails = new Set;
        let phone_confirmed = new Set;
        let title;
        if (domain != "null") {
        //try {
            const fetch_Response = fetch(domain).then(function(response) {
                return response.text()}).then((txt) => {       
                    let contact_Page_full;
                    try {
                        title = txt.match(/(?<=\<title\>).*?(?=\<)/)[0]
                    }
                    catch {}
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
                                    res(all_phones, list_of_emails)
                                }
                                else {
                                    list_of_emails = null
                                    console.log("No emails found on Contact page and home page Found");
                                    res({phones: "N/A", emails: "N/A"})
                                }
                                    
                                }).catch((error) => console.log(error), res({phones: "N/A", emails: "N/A"}))
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
                        res({phones: all_phones, emails: list_of_emails})
                    }
                }).catch(function(error) {
                    res({phones: "N/A", emails: "N/A"})
                    console.log(error)})
        }
        else {
            res({phones: "N/A", emails: "N/A"})
        }
    })
}


function inser_Record(record, company_or_Contact) {
    console.log("inser_Record(record, company_or_Contact); Company or contact? : " + company_or_Contact);

    let insert_transaction;
    let objectS;
    if (company_or_Contact == "Company") {
        insert_transaction = db_Companies.transaction("Company", "readwrite");
        objectS = insert_transaction.objectStore("Company");
    } else {
        insert_transaction = db_Contacts.transaction("Contact", "readwrite");
        objectS = insert_transaction.objectStore("Contact");
    }
    return new Promise((resolve, reject) => {
        insert_transaction.oncomplete = function () {
            resolve = true;
        }
        insert_transaction.onerror = async function (event) {
            console.log("Problem Adding Transaction");
            console.log(event.target.error);
            if (company_or_Contact == "Contact-Enrichment") {
                await LS.setItem("Contact-Enrichment-Extracted-and-Sent-to-API", "true");
                job_experience_array_new_url = null;
            }
            else if (is_Automation == true) {
                is_Automation = false
                automation_extraction_completed = true
            }
            resolve = false;
        }
        let requ;

        if (company_or_Contact == "Company") {
console.log("Adding company: " + record);
            requ = objectS.add(record);
        } else {
            requ = objectS.add({
                "linkedin_page": record.linkedin_page
            })
        }

        requ.onsuccess = function () {
            console.log("All Transactions ADDED to Database")
            let value = objectS.count()
            value.onsuccess = async function () {
                //tick button
                if (company_or_Contact == "Company") {
                    await LS.setItem("Company_Leads_Count", value.result)
                    call_API(record, "Company")
                } else if (company_or_Contact == "Contact-Extract-Next") {
                    await LS.setItem("Contact_Leads_Count", value.result)
                    call_API(record, "Contact")
                    try {
                        let list_to_Extract = await LS.getItem('Extraction_list').split(",")
                            console.log(list_to_Extract)
                            let next_Lead = list_to_Extract.shift()
                            console.log(next_Lead)
                            if (list_to_Extract.length == null) {

                                var r = confirm(`All Leads Extracted, Do you wish to extract more?`);
                                if (r == true) {
                                    chrome.tabs.sendMessage(parseInt(await LS.getItem("tab_Id_extract_All_function")), {
                                        message: "Extract-Next-Pages"
                                    })
                                } else {}
                            } else {
                                setTimeout(async () => {
                                    window.open(next_Lead + '?extr_id=', "Extr-All-Clicked", "height=100,width=200", "_blank");
                                    await LS.setItem("Extraction_list", list_to_Extract)
                                }, 3000)
                            }
                    } catch {
                        console.log("***inside Catch***")
                        var r = confirm(`All Leads Extracted, Do you wish to extract more?`);
                        if (r == true) {
                            chrome.tabs.sendMessage(parseInt(await LS.getItem("tab_Id_extract_All_function")), {
                                message: "Extract-Next-Pages"
                            })
                        } else {}
                    }
                } else if (company_or_Contact == "Contact-Enrichment") {
                    call_API(record, "Contact-Enrichment")
                } else if (company_or_Contact == "AUTOLIST-Contact-Extract-Next") {
                    console.log("else if (company_or_Contact == \"AUTOLIST-Contact-Extract-Next\")");
                    await LS.setItem("Contact_Leads_Count", value.result)
                    call_API(record, "Contact")
                    let list_to_Extract = await LS.getItem('AUTOLIST_Extraction_list').split(",")
                    async function check_then_Open_Tab_Next_Employee() {
                        console.log("else if (company_or_Contact == \"AUTOLIST-Contact-Extract-Next\") ==> async function check_then_Open_Tab_Next_Employee()");
                        while (true) {
                            let leads_to_Check = list_to_Extract[0]
                                if (leads_to_Check != null && leads_to_Check != "") {
                                    console.log("else if (company_or_Contact == \"AUTOLIST-Contact-Extract-Next\") ==> REMOVED check_then_Open_Tab_Next_Employee() ==> (leads_to_Check != null && leads_to_Check != \"\")");
                                    console.log(leads_to_Check)
                                    //let check_if_Employee_Was_Already_Extracted = await check_Record_Existance(leads_to_Check, "Contact")
                                    if (list_to_Extract.length == 0 || leads_to_Check.length == 0) {
                                        await LS.setItem("AUTOLIST_All_Employees_for_this_keyword_Extracted", "true")
                                        break
                                    }
                                        //if (check_if_Employee_Was_Already_Extracted == false) {

                                            //} 
                                            //if lead was already extracted, remove it from array and continue loop.
                                    else {
                                        window.open(list_to_Extract.shift(), "Autolist-Contact", "height=100,width=200", "_blank");
                                        await LS.setItem('AUTOLIST_Extraction_list', list_to_Extract)
                                        break
                                    }
                                } else {
                                    await LS.setItem("AUTOLIST_All_Employees_for_this_keyword_Extracted", "true")
                                    break
                                }
                        }
                    }
                    setTimeout(() => {
                        check_then_Open_Tab_Next_Employee()
                    }, 3000)

                } 
                else {
                    await LS.setItem("Contact_Leads_Count", value.result)
                    call_API(record, "Contact")
                }
                console.log("ALL ADDED to Database")
            }
        }

        requ.onerror = async function () {
            console.log("Error requ adding transaction")
            if (await LS.getItem("AUTOLIST_Company_About_Received") == "true") {
                //If contact came from auto list mode, set back to false
                await LS.setItem("AUTOLIST_Company_About_Received", "false")
                //Allow the employees to be scraped
                await LS.setItem("AUTOLIST_Company_About_Fetched", "true")
            } else if (company_or_Contact == "Contact-Extract-Next") {
                console.log("next is extract NEXT LEAD")
                try {
                    let list_to_Extract = await LS.getItem('Extraction_list').split(",")
                        let next_Lead = list_to_Extract.shift()
                        if (next_Lead.length == 0 || next_Lead.length == "0") {
                            var r = confirm(`All Leads Extracted, Do you wish to extract more?`);
                            if (r == true) {
                                chrome.tabs.sendMessage(parseInt(await LS.getItem("tab_Id_extract_All_function")), {
                                    message: "Extract-Next-Pages",
                                    number_of_pages: parseInt(storageCache.number_of_pages_to_scroll)
                                })
                            } else {}
                        } else {
                            window.open(next_Lead, "Extr-All-Clicked", "height=100,width=200", "_blank");
                            await LS.setItem("Extraction_list", list_to_Extract)
                        }
                } catch {
                    console.log("Inside catch, list ended")
                    var r = confirm(`All Leads Extracted, Do you wish to extract more?`);
                    if (r == true) {
                        chrome.tabs.sendMessage(parseInt(await LS.getItem("tab_Id_extract_All_function")), {
                            message: "Extract-Next-Pages",
                            number_of_pages: parseInt(storageCache.number_of_pages_to_scroll)
                        })
                    } else {}
                }
            } else if (company_or_Contact == "AUTOLIST-Contact-Extract-Next") {
                let list_to_Extract = await LS.getItem('AUTOLIST_Extraction_list').split(",")
                    let next_Lead = list_to_Extract.shift()
                    //if no more leads to extract, stop employee automation
                    if (next_Lead.length == 0 || next_Lead.length == "0") {
                        await LS.setItem("AUTOLIST_All_Employees_for_this_keyword_Extracted", "true")
                        chrome.runtime.sendMessage({
                            message: "message_For_Console",
                            message_to_display: `All Leads Extracted`
                        })
                    } else {
                        window.open(next_Lead, "Autolist-Contact", "height=100,width=200", "_blank");
                        await LS.setItem("AUTOLIST_Extraction_list", list_to_Extract)
                    }
            }
        }

    });
}


async function call_API(record, company_Or_Contact) {
    console.log("call_API(record, company_Or_Contact): ", record);
    var xhr = new XMLHttpRequest();
    if (company_Or_Contact == "Company") {
        xhr.open("POST", api_URL_Company + '/' + storageCache.user_id + '/' + storageCache.list_code);
    } else if (company_Or_Contact == "Contact-Enrichment") {
        xhr.open("POST", api_URL_Contact + '/' + storageCache.user_id + '/' + storageCache.list_code)
    } else {
        xhr.open("POST", api_URL_Contact + '/' + storageCache.user_id + '/' + storageCache.list_code)
    }
    xhr.setRequestHeader("Accept", "application/json");
    xhr.setRequestHeader("Content-Type", "application/json");

    xhr.onreadystatechange = async function () {
        if (xhr.readyState === 4) {
            if (xhr.status.toString().substring(0, 1) != "2") {
                job_experience_array_new_url = null
                    delete_Record(record, company_Or_Contact)
                    chrome.notifications.create({
                        type: 'basic',
                        iconUrl: 'Images/128.png',
                        title: `Bexten - AC | API ERROR`,
                        message: JSON.stringify(xhr.response),
                        priority: 1
                    });
                    if (await LS.getItem("AUTOLIST_Company_About_Received") == "true") {
                        //If contact came from auto list mode, set back to false
                        await LS.setItem("AUTOLIST_Company_About_Received", "false")
                        //Allow the employees to be scraped
                        await LS.setItem("AUTOLIST_Company_About_Fetched", "true")
                    } else if (company_Or_Contact == "Contact-Enrichment") {
                        await LS.setItem("Contact-Enrichment-Extracted-and-Sent-to-API", "true")
                    }
            } 
            else {
                if (await LS.getItem("AUTOLIST_Company_About_Received") == "true") {
                    //If contact came from auto list mode, set back to false
                    await LS.setItem("AUTOLIST_Company_About_Received", "false")
                    //Allow the employees to be scraped
                    await LS.setItem("AUTOLIST_Company_About_Fetched", "true")
                } else if (company_Or_Contact == "Contact-Enrichment") {
                    await LS.setItem("Contact-Enrichment-Extracted-and-Sent-to-API", "true")
                } else if (is_Automation == true) {
                    is_Automation = false
                    automation_extraction_completed = true
                }
                job_experience_array_new_url = null
            }
            await LS.setItem("email_found", null)
            await LS.setItem("company_ID", null)
        }
    };
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
            "created_by": check_NaN(storageCache.user_id),
            "facebookpage": record.Company_Facebook,
            "instagrampage": record.Company_Instagram,
            "twitterpage": record.Company_Twitter,
            "running_code": storageCache.list_code,
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
    console.log(api_message)
    if (await LS.getItem("auto-confirmation-ON-OFF-TOGGLE") == "OFF" && await LS.getItem("auto-confirmation-LIST-MODE") == "OFF" && await LS.getItem("auto-confirmation-LIST-CONTACTS-MODE") == "OFF") {
        if (company_Or_Contact == "Contact") {
            var r = confirm(`Leads Information Below, Confirm Please\n\nFirst Name: ${record.first_Name}\nLast Name: ${record.last_name}\nEmail: ${record.email}\nAbout: ${record.about}\nPicture Url: ${record.picture_url}\nLinkedin Page: ${record.linkedin_page}\nFull Addres: ${record.full_address}\nAbout: ${record.about}\nLanguages: ${record.languages}\nExperience: ${record.experience}`);
            if (r == true) {
                console.log(api_message)
                xhr.send(JSON.stringify(api_message));
                // inser_Record(record)
            } else {
                delete_Record(record, company_Or_Contact)
            }
        } 
        else {
            xhr.send(JSON.stringify(api_message));
        }
    } else {
        xhr.send(JSON.stringify(api_message));
    }

}

async function call_API_fetch(record, company_Or_Contact) {
    console.log("call_API_fetch()")
    //defining right url API
    if (company_Or_Contact == "Company") {
        api_url = api_URL_Company + '/' + storageCache.user_id + '/' + storageCache.list_code;
    } 
    else if (company_Or_Contact == "Contact-Enrichment") {
        api_url = api_URL_Contact + '/' + storageCache.user_id + '/' + storageCache.list_code
    } 
    else {
        api_url = api_URL_Contact + '/' + storageCache.user_id + '/' + storageCache.list_code
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
            "created_by": check_NaN(storageCache.user_id),
            "facebookpage": record.Company_Facebook,
            "instagrampage": record.Company_Instagram,
            "twitterpage": record.Company_Twitter,
            "running_code": storageCache.list_code,
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
        console.log(response)
        return response.json()})
    .then(async (json) => {
        job_experience_array_new_url = null
        if (is_Automation == true) {
            is_Automation = false
            automation_extraction_completed = true
        }
        await LS.setItem("email_found", null)
        await LS.setItem("company_ID", null)
    })
}

async function enrich_contacts_by_li_profile(total_contacts_list) {
    console.log("enrich_contacts_by_li_profile(total_contacts_list): ", total_contacts_list.length);
    //I'M HERE
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'Images/128.png',
        title: 'Scrapping ' + Object.keys(total_contacts_list).length + ' Automatic',
        message: 'Starting',
        priority: 1
    }) //done
    let scrapped_total_contacts = 0; //done
    for (let i = 0; i < total_contacts_list.length; i++) {
        let clean_url = total_contacts_list[i].linkedin_profile

            chrome.runtime.sendMessage({
                message: "message_For_Console",
                message_to_display: `Extracting: ${clean_url}`
            })
            if (clean_url) {
                await extract_next_employee_Enrichment(clean_url)
            }
    }
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

function call_API_any_company_to_extract() {
    console.log("call_API_any_company_to_extract() ");

    fetch(api_get_next_company, {
        // Adding method type
        method: "GET"
    })
    .then(response => response.json())
    .then(async (json) => {
        console.log(json)

            if (json == null) {
                console.error("Server Response Empty, no more company to scrape automatically");
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