---
description: Description of the names of the objects
---

# Object name rules

## Schema objects

The schema objects describe a data structure that is passed via a config or API. Schemas are validated for the data. Whenever it is important that a data structure must be correct, a schema object is used.

These objects start with the name `Schema` and then the actual name of the structure/record follows.

Example:

`SchemaDomainRecord`

and

`DomainRecord`

{% hint style="info" %}
All these schemas are collected in the "schemas" library. These are used in several FlyingFish part programs or in the API.
{% endhint %}

## Database objects

The DB objects were combined in the core library. Since several sub-programs of the FlyingFish share the DB in order to fulfill the tasks accordingly. If data/settings are changed in the frontend via the backend and saved in the DB, the SSH jump server, for example, can use them immediately.

#### Objects beginning with DB

Are neutral DB objects that provide interfaces to the DB: Examples:&#x20;

* `DBHelper`
* `DBBaseEntityId`
* `DBService`
* ...

#### Objects ending with DB

Are data or service (for the data) DB objects, these handle the data to the DB.

* `DomainDB`
* `UserDB`
* `DomainServiceDB`
* ...
