**LEGEND:**

Integer = Blue

Float = Green

String = Pink

Boolean = Red

Vector = Gold

Trigger = Purple(onComplete)/Dark Purple(onFail)





**< TRIGGERS >**



**-----------**

**Backup**

IN:

* Cooldown (integer)

OUT:

* onComplete (trigger)
* onFail (trigger)



\------------

**Interval**

IN:

* Interval (integer minutes)   # in minutes



OUT:

* onComplete (trigger)



\-----------

**Player**

Type (Dropdown):

* Joined
* Left

IN: 

* Cooldown (integer)

OUT:

* onComplete (trigger)
* PlayerName (string)
* PlayerIP (string)





\------------

**Server**

**Type (Dropdown):**

* **Stopped**
* **Started**
* **Crashed**

IN:

* Cooldown (integer)

OUT:

* onComplete (trigger)





















\--------------

**Constant**

Type (Dropdown):

* Float
* Integer
* String
* Boolean
* Vector

IN:

* value

OUT:

* value



**Math**

Type:

* Add
* Subtract
* Multiply
* Divide
* Difference
* ...

IN:

* A
* B

OUT:

* Result





**ATTRIBUTES**

**Read:**

@tps (Integer)

@players.count (Integer)

@ram.used (MB,Integer

@ram.left (MB,Integer)

@server.status (Boolean)



**Read \& Write:**

@players.max (Integer)

@ram.total (MB,Integer)

@server.world (string)

@server.whitelist (Boolean)

@server.port (integer)

@server.gamemode (integer)

@server.motd (string)













\-----------

**Command:**

IN:

* trigger (trigger)
* command (string) +Presets: (Start Server, Stop Server, Restart, Save All, Freeze Time, etc.)

OUT:

* onComplete (trigger)
* command (string)



**RCON Command:**

**IN:**

* trigger (trigger)
* command (string) +Presets

**OUT:**

* &#x20;**" "**
* &#x20;**" "**



**Backup**

**IN:**

* trigger (trigger)

**OUT:**

* onComplete (trigger)
* filename (string)







\----------

**Condition**

**Operator:**

* **Equals**
* **Greather** 
* **....**

**IN**

* A
* **B**

**OUT**

* onComplete (trigger)
* onFail (trigger)















ADJUST ALL OTHER NOT MENTIONED BLOCKS TO FOLLOW THIS SCHEME/STYLE. REMOVE BLOCKS WHOS FUNCTION IS INCLUDED IN ANOTHER BLOCK (EG. Start Server -> Command).

ALL VALUES SHOULD BE BASED ON ATTRIBUTE VALUE.

