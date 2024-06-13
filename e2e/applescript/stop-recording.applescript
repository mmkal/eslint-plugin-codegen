-- Click the “Stop Recording” menu bar item.
delay 3.451958
set timeoutSeconds to 2.000000
set uiScript to "click menu bar item 1 of menu bar 1 of application process \"screencaptureui\""
my doWithTimeout( uiScript, timeoutSeconds )

on doWithTimeout(uiScript, timeoutSeconds)
	set endDate to (current date) + timeoutSeconds
	repeat
		try
			run script "tell application \"System Events\"
" & uiScript & "
end tell"
			exit repeat
		on error errorMessage
			if ((current date) > endDate) then
				error "Can not " & uiScript
			end if
		end try
	end repeat
end doWithTimeout
