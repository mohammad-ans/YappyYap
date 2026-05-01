<h1>Yappy Yap</h1>

<h2>A guide to use</h2>
<p>The personal messages of the site are in beta feature. There are some errors that are continuosly persisting but they are being solved as soon as found.</p>
<p>For trying the dms, if your messages are not being sent, try changing navigation and then sending twice. It doesn't works first time most of the times as of now due to some class and rendering issues but the sent messages are not lost. Just the live transfer for first sent msgs may vary but it becomes fine over time</p>
<p>In fact the whole site is in beta feature, so if you reach an error or unreachable state, please referesh the page. A good feedback will be very much appreciated.</p>
<p>For trying the dms it is recommended to use two different devices</p>
<p>Most of the features are listed below.</p>

<h2>Detailed Explanation of Features And My Learning</h2>


<p>You can specify time for each of your message and it will be deleted after the specified amount of time from the chat and also from our database though it might take some seconds as you can see by reviewring the scehduleler.py file in the Backend folder which does the clean up jobs.</p>


<p>On the chat page you can also see an anonymity button that will hide your identity by sending your messages with anonymity "on" option in linkage to a dummy username.</p>

<p>A user can create a realm of their choice type of messages with some features of allowing live count, anonymity, number of members and the duration.</p>

<p>The owner can also specify of how other users can join their group, free join or invitation only. And then they can send invitations to other users to join their group</p>

<p>The owner can search and invite users by going to the member area of their realm. The owner can also remove users from the members page.</p>

<p>By default all users are included in the two main realms, global(text) realm and the voice realm.</p>

<h3>Note:</h3>
<p>The voice is group is very slow as of now and is under development so it is just a beta feature of the application, especially for the custom realms as their is processing of audio files done so that takes time making them very slow, so be ready with lots of patience while testing or trying them.</p>

<p>Basic searching of users and groups. User can join the free groups by searching or direct message users also by searching by their usernames</p>

<p>User can also click on the three dots to send personal dm message to another user. For persoanl messages, sender can specify type of duration. If set to true(default duration), expire duration will start counting from current time. If default duration is turned off, expiration of the message(duration length) starts when the user becomes online once.</p>

<p>For non default duration, duration will not stop if the user becomes online once and then goes offline again.</p>

<p>The user can login with google if they have an account</p>

<p>There is option to register as both guests and permanent users although both gets different time sessions that are made short for user's own benefit</p>


<p>You can also read more about the features and constraints on terms page of the site</p>


<p>The website also has an admin dashboard. It is not among the best but it does what is required and of course it is authorized to admins only</p>


<p>This website contains a lot of animations and to be honest a large chunk of my time was taken developing those but I learnt from them and now I can make animations much easier</p>


<h2>Making of site</h2>


<p>I wanted to learn about how to make websites and had quite an idea about how by watching tutorials or developing some daily helping single page sites that helped but they had no interface as I was the only user and to be honest instead of doing effort to make an interface I would prefer using some weird interface or terminal cz its easier, serves my laziness. So I decided that I would make some good website and I thought a hard about ideas and couple came to mind but I chose this as I had previously worked with websockets so I decided lets go for a simple chat application and then I continued to build upon it, even now I m doing it.</p>

<h2>Optimization</h2>
<p>The main and most important optimizations are the schedulers services deployed as microservices along side the backend. Their code can be seen in /Backend/Scheduler folders. They delete the old messages regularly ensuring that there are no expired messages which ensure that there is less database storage used and less search operations as the expired messages are removed</p>
<p>Max lenght of duration of a message is 5 minutes so if n messages were sent in 5 minutes and therefore n squared in 25 minutes. But the messages are removed, making search space n again. This grows exponentially as time increases</p>

<p>Micro services are used, each deployed as a separate service isolated from others. It isolates services of groups, dms, 2 global realms and dashboard with separate database servers making backend end points and database sessions light weight, less traffic and therefore fast</p>

<h2>Usage of AI</h2>
<p>AI was used to very least extent and even then when I used it I made sure that I try something different than what AI assumes the solution to be in an effort to make this project as least AI slop as possible.</p>



<h2>Features</h2>


<ul>


  <li>Provides Anonymity.</li>


  <li>Easy to Use</li>


  <li>Beautiful interface</li>


</ul>

