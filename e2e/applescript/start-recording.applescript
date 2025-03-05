-- Kill "QuickTime Player" if running
say "Closing quicktime!"
tell application "QuickTime Player" to if it is running then quit
delay 2

-- Click “QuickTime Player” in the Dock.
say "Opening quicktime!"
set timeoutSeconds to 2.000000
set uiScript to "click UI Element \"QuickTime Player\" of list 1 of application process \"Dock\""
my doWithTimeout( uiScript, timeoutSeconds )
delay 2

-- Click the “Cancel” button.
say "Cancelling quicktime!"
set timeoutSeconds to 2.000000
set uiScript to "click UI Element \"Cancel\" of window \"Open\" of application process \"QuickTime Player\""
my doWithTimeout( uiScript, timeoutSeconds )


-- Click the “File” menu.
set timeoutSeconds to 2.000000
set uiScript to "click menu bar item \"File\" of menu bar 1 of application process \"QuickTime Player\""
my doWithTimeout( uiScript, timeoutSeconds )

-- New Screen Recording
set timeoutSeconds to 2.000000
set uiScript to "click menu item \"New Screen Recording\" of menu 1 of menu bar item \"File\" of menu bar 1 of application process \"QuickTime Player\""
my doWithTimeout( uiScript, timeoutSeconds )

tell application "System Events"
    delay 0.5
    keystroke return
end tell


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
