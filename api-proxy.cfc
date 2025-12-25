<cfcomponent>
    <cffunction name="callDeepSeekAPI" access="remote" returntype="any" returnformat="json">
        
        <cfscript> 

            consoleLoggingStatus    = "Yes";
            fileLogging             =  "No"; 

            // Replace with your api log file name
            finalFileAndPath        = expandPath("/") & "\CF_logs\" & "[ your log file name ]_api_log.txt";  

            // Replace with your DeepSeek API key
             
            api_key                 = "[ your api key] ";  



            if ( fileLogging eq "yes")
                {
                    fileAppend(finalFileAndPath, "===============================================================================================   #chr(10)##chr(13)#<br>");
                    fileAppend(finalFileAndPath, "testing  #chr(10)##chr(13)#<br>");
                }

 

            // Set CORS headers
            cfheader(name="Access-Control-Allow-Origin", value="*");
            cfheader(name="Access-Control-Allow-Methods", value="POST, OPTIONS");
            cfheader(name="Access-Control-Allow-Headers", value="Content-Type");
            
            // Handle preflight OPTIONS request
            if (cgi.request_method == "OPTIONS") {
                cfheader(statuscode="200", statustext="OK");
                return "";
            }
            
            try {
                // Get request data from POST body
                local.requestData = "";
                local.httpRequestData = getHttpRequestData();
                if (isDefined("local.httpRequestData.content") and len(local.httpRequestData.content)) {
                    local.postBody = toString(local.httpRequestData.content);
                    local.postData = deserializeJSON(local.postBody);
                    if (isDefined("local.postData.requestData")) {
                        local.requestData = local.postData.requestData;
                    }
                }
                
                // If no request data, return test response
                if (len(local.requestData) == 0) {
                    return {"test": "CFC is working but no requestData received"};
                }
                
                // Parse the request
                local.originalPayload = deserializeJSON(local.requestData);



            if ( fileLogging eq "yes")
                {
                    // Log the payload structure for debugging
                    fileAppend(finalFileAndPath, "===============================================================================================   #chr(10)##chr(13)#<br>");
                    fileAppend(finalFileAndPath, "#dateTimeFormat(now(), 'yyyy-mm-dd HH:nn:ss')# - Original Payload Structure: #serializeJSON(local.originalPayload)#  #chr(10)##chr(13)#<br>");
                }




                // Check if this is already a complete DeepSeek API payload
                if (structKeyExists(local.originalPayload, "model") and structKeyExists(local.originalPayload, "messages")) {
                    // Use the payload as-is since it's already properly formatted
                    local.payload = local.originalPayload;
                    
                    // Ensure it has the required DeepSeek model
                    if (local.payload.model != "deepseek-chat") {
                        local.payload.model = "deepseek-chat";
                    }
                    
                } else {
                    // Legacy handling - extract message and create API payload
                    local.message = "";
                    
                    if (structKeyExists(local.originalPayload, "inputs")) {
                        local.message = local.originalPayload.inputs;
                    } else if (structKeyExists(local.originalPayload, "message")) {
                        local.message = local.originalPayload.message;
                    } else if (structKeyExists(local.originalPayload, "content")) {
                        local.message = local.originalPayload.content;
                    } else if (structKeyExists(local.originalPayload, "text")) {
                        local.message = local.originalPayload.text;
                    } else {
                        local.message = serializeJSON(local.originalPayload);
                    }
                    
                    // Ensure we have a message
                    if (len(trim(local.message)) == 0) {
                        return {
                            "error": "No message content found in payload",
                            "payload_received": local.originalPayload
                        };
                    }
                    
                    // Create DeepSeek API payload structure
                    local.payload = {
                        "model": "deepseek-chat",
                        "messages": [
                            {
                                "role": "user",
                                "content": local.message
                            }
                        ],
                        "max_tokens": 700,
                        "temperature": 0.7,
                        "stream": false
                    };
                }





            if ( fileLogging eq "yes")
                {
                    fileAppend(finalFileAndPath, "Final API Payload: #serializeJSON(local.payload)#  #chr(10)##chr(13)#<br>");
                }




                cfhttp(
                    method = "POST",
                    url = "https://api.deepseek.com/v1/chat/completions",
                    result = "apiResponse",
                    timeout = "60"
                ) {
                    cfhttpparam(
                        type = "header",
                        name = "Authorization",
                        value = "Bearer  #api_key#"
                    );
                    cfhttpparam(
                        type = "header",
                        name = "Content-Type",
                        value = "application/json"
                    );
                    cfhttpparam(
                        type = "body",
                        value = serializeJSON(local.payload)
                    );
                }
                
                // Check if request succeeded
                if (isDefined("apiResponse.statusCode") and apiResponse.statusCode == "200 OK" and isDefined("apiResponse.fileContent") and isJSON(apiResponse.fileContent)) {
                    local.response = deserializeJSON(apiResponse.fileContent);




             if ( fileLogging eq "yes")
                {  
                    fileAppend(finalFileAndPath, "===============================================================================================   #chr(10)##chr(13)#<br>");
                    fileAppend(finalFileAndPath, "#dateTimeFormat(now(), 'yyyy-mm-dd HH:nn:ss')# - API Response: #apiResponse.fileContent#  #chr(10)##chr(13)#<br>");
                }




                    // Extract the generated text from DeepSeek response
                    if (structKeyExists(local.response, "choices") and arrayLen(local.response.choices) > 0) {
                        local.firstChoice = local.response.choices[1];
                        if (structKeyExists(local.firstChoice, "message") and structKeyExists(local.firstChoice.message, "content")) {
                            local.generatedText = local.firstChoice.message.content;
                            local.generatedText = trim(local.generatedText);
                            
                            if (len(local.generatedText) > 0) {
                                return {
                                    "generated_text": local.generatedText,
                                    "model_used": "deepseek-chat",
                                    "success": true
                                };
                            }
                        }
                    }
                }
                
                // Log failed response
                fileAppend(finalFileAndPath, "===============================================================================================   #chr(10)##chr(13)#<br>");
                fileAppend(finalFileAndPath, "#dateTimeFormat(now(), 'yyyy-mm-dd HH:nn:ss')# - API FAILED - Status: #(isDefined('apiResponse.statusCode') ? apiResponse.statusCode : 'No status')# - Response: #(isDefined('apiResponse.fileContent') ? apiResponse.fileContent : 'No content')#  #chr(10)##chr(13)#<br>");
                
                // If failed, return error details
                return {
                    "error": "DeepSeek API failed",
                    "status": isDefined("apiResponse.statusCode") ? apiResponse.statusCode : "No status",
                    "response": isDefined("apiResponse.fileContent") ? apiResponse.fileContent : "No response content"
                };
                
            } catch (any e) {
                fileAppend(finalFileAndPath, "===============================================================================================   #chr(10)##chr(13)#<br>");
                fileAppend(finalFileAndPath, "#dateTimeFormat(now(), 'yyyy-mm-dd HH:nn:ss')# - EXCEPTION: #e.message# - Detail: #(isDefined('e.detail') ? e.detail : 'No detail')#  #chr(10)##chr(13)#<br>");
                
                return {
                    "error": "CFC error: " & e.message,
                    "detail": isDefined("e.detail") ? e.detail : "No additional detail",
                    "type": isDefined("e.type") ? e.type : "Unknown error type"
                };
            }
        </cfscript>
    </cffunction>
    
    <cffunction name="testDeepSeek" access="remote" returntype="any" returnformat="json">
        <cfscript>
            cfheader(name="Access-Control-Allow-Origin", value="*");
            
            try {
                // Test a simple chat completion with DeepSeek
                local.testPayload = {
                    "model": "deepseek-chat",
                    "messages": [
                        {
                            "role": "user",
                            "content": "Say hello"
                        }
                    ],
                    "max_tokens": 50,
                    "temperature": 0.7
                };
                
                cfhttp(
                    method = "POST",
                    url = "https://api.deepseek.com/v1/chat/completions",
                    result = "testResponse",
                    timeout = "15"
                ) {
                    cfhttpparam(
                        type = "header",
                        name = "Authorization",
                        value = "Bearer #api_key#"
                    );
                    cfhttpparam(
                        type = "header",
                        name = "Content-Type",
                        value = "application/json"
                    );
                    cfhttpparam(
                        type = "body",
                        value = serializeJSON(local.testPayload)
                    );
                }
                
                return {
                    "deepseek_test": "completed",
                    "status": testResponse.statusCode,
                    "response": testResponse.fileContent,
                    "token_sent": " #api_key#"
                };
                
            } catch (any e) {
                return {
                    "error": "DeepSeek test failed: " & e.message
                };
            }
        </cfscript>
    </cffunction>
</cfcomponent>