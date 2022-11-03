# Template for email notes

The template help you format and categorize email notes with their intrinsic attributes, and your personal annotations.

Here's an example with [Dataview](https://github.com/blacksmithgu/obsidian-dataview) Inline Fields

```md
title:: ${Subject} 
tag::  ${Labels}, #captured/email
from:: ${From}
date:: [[${Date}]]
link:: [gmail](${Link})

---

${Body} 
```

## Main Intrinsic Attributes
|Name|Placeholder|Render Format|Description|
|---|---|---|---|
|Subject| ${Subject}| Plain text|Email Subject|
|Labels| ${Labels}|[[label0]], [[lable1]],...|Gmail labels|
|From| ${From}|Plain text|Sender:
|Date| ${Date}| YYYY-MM-DD| Received Date
|Link| ${Link}|https://...|Link to the original email
|Body| ${Body}|html as markdown|Email Body|

## All Intrinsic Attributes

All the header fields can be placed in email notes. But only the main attributes are rendered properly. Leave a issue if any fields you want to rendered in specialized format.


|Index| Field| Example Content|
|---|---|---|
|0| ${Delivered-T|}" => "**@gmail.com"}|
|1| ${Received}| => "from ODExNDcwNQ (unknown) by geopod-ismtpd-3-0 (SG) with HTTP id dNrNP-U_RS-xO2mT6YnJ8g Fri, 28 Oct 2022 12:52:29.564 +0000 (UTC)"}|
|2| ${X-Googl|-Smtp-Source}" => "AMsMyM5Zoow2orrC0nUvBUqZ0nKybJ7pM05XM/u/Oe"}|
|3| ${X-Receive|}" => "by 2002:a37:8243:0:b0:6ee:ca5d:99b6 with SMTP id e64-20020a378243000084qkd.553.1666961639480; Fri, 28 Oct 2022 05:53:59 -0700 (PDT)"}|
|4| ${ARC-Sea|}" => "i=1; a=rsa-sha256; t=1666961639; cv=none; d=google.com; s=arc-20160816; b=y/N499rK2Qkz1/8MX3kwXy/zTRc H7Jw=="}|
|5| ${ARC-Messag|-Signature}" => "i=1; a=rsa-sha256; c=relaxed/relaxed; d=google.com; s=arc-20160816; h=to:subject:message-id:mime-version:from:date :content-transfer-encoding:dkim-signature:dkim-signature; bh=K+4mnPRk4M2vkW8aAAAN+tG7vAHI8HagxAZTAlOHu8k=; b=euGCZBKsq/LZQwWcZKbJbiVmcFEhJdW5L3rlIkmRb/w0W65+OjKNMxFA2xiXJGlEOm emFyBh65asZ36BEKgtMjiJuD/OCWCoUl8nrDwwgGvyfrT9u5d0JgJQmA9UrazFyDeJIg o2YRQqmCHpTOmfUgas2hzZoh0hk850Gsd/daMxYqt22T34FRhj3HBr3PJhWVd6E48IZ4 TGn+N+qZYHLWxZd2QJoIWhNv0Okqcvl9lkwfFTchCA9yJRK32ZypaOrGaMiCiQ3lyif8 by+hQ3EbZ1rRCDL0XfglwhLNgya7VTfBuVJa2NXVFwpnDZBg/42ZCFosyBJtGi7B+gr+ 29IQ=="}|
|6| ${ARC-Authenticatio|-Results}" => "i=1; mx.google.com; dkim=pass header.i=@gamma.to header.s=s1 header.b=AtFtnwlh; dkim=pass header.i=@sendgrid.info header.s=smtpapi header.b=mxjb654H; spf=pass (google.com: domain of bounces+8114705-5b3d-user=gmail.com@em3261.gamma.to designates 149.72.115.133 as permitted sender) smtp.mailfrom="bounces+8114705-5b3d-user=gmail.com@em3261.gamma.to""}|
|7| ${Return-Pat|}" => "<bounces+8114705-5b3d-=gmail.com@em3a.to>"}|
|8| ${Received-SP|}" => "pass (google.com: domain of bounces+8114705-5b3d-=gmail.com@em3261.gamma.to designates 149.72.115.133 as permitted sender) client-ip=149.72.115.133;"}|
|9| ${Authentication-Result|}" => "mx.google.com; dkim=pass header.i=@gamma.to header.s=s1 header.b=AtFtnwlh; dkim=pass header.i=@sendgrid.info header.s=smtpapi header.b=mxjb654H; spf=pass (google.com: domain of bounces+8114705-5b3d-user=gmail.com@em3261.gamma.to designates 149.72.115.133 as permitted sender) smtp.mailfrom="bounces+8114705-5b3d-user=gmail.com@em3261.gamma.to""}|
|10| ${DKIM-Signatur|}" => "v=1; a=rsa-sha256; c=relaxed/relaxed; d=sendgrid.info; h=content-transfer-encoding:content-type:from:mime-version:subject: x-feedback-id:to:cc; s=smtpapi; bh=K+4mnPRk4M2vkW8aAAAN+tG7vAHI8HagxAZTAlOHu8k=; b=mxjb654HcNHANX9VxCyqMc60KCeow7WWTmhp13VXKhJBg5d/Rv5uSQPLN7jG3bdqTnRd DSKJ8Ul1yvc7wMV9jZQ3HPPEI8JlwxbgAVyVeAMKXojeqsTjBz86zt4bgScg0vZh5/qAjX xq0e8b9fbYbZBFlwySNHlUpNMyHrdHfdg="}|
|11| ${Content-Transfe|-Encoding}" => "quoted-printable"}|
|12| ${Content-Typ|}" => "text/html; charset=utf-8"}|
|13| ${Date}| => "2022-10-28"}|
|14| ${From}| => "Gamma Official <info@gamma.to>"}|
|15| ${Mime-Versio|}" => "1.0"}|
|16| ${Message-I|}" => "<dNrNP-U_RS-xO2mT6YnJ8g@geopod-ismtpd-3-0>"}|
|17| ${Subject}| => "AMZN, SHOP, PINS, INMD Q3’22 財報分析 - Gamma Official"}|
|18| ${X-Feedbac|-ID}" => "8114705:SG"}|
|19| ${X-S|-EID}" => "Cyi5gbrsWqIpgDix8/xPt+lhibP7tdtTAgh9FyMJjZmyNpNmCpIjaWyS174fhiY1gvB3rDfLZqj6D01bg76gbetKJMzfaWUPbjViz/sd4j5En52xB89XpCqYzKUQ1sOl9VvS91aF8p9ikMk/uyfauUOHmbzab6WEYDXzy92y6yR+z7CcNZu0apKQ3E83wONGr3jWJnhFduVSOs531IHY8aTZTmlUrBhUkU8DdY4rCp5pd8Hu4bSxOhXPGPssBjlq"}|
|20| ${To}| => "Lite Chen <user@gmail.com>"}|
|21| ${X-Entit|-ID}" => "DZADwym5td5gwoGx+0pSUQ=="}|
|22| ${Labels}| => "[[IMPORTANT]], [[CATEGORY_UPDATES]], [[ReadingList]]"}|
|23| ${Body}| => |
|24| ${Link}| => "https://mail.google.com/mai|