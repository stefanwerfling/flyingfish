---
description: Creation and use of schemas
---

# Schema

Schemas are an important part of FlyingFish. It must always be checked which data is transferred externally. It is always checked whether the types and structure of the data are correct and only then can proper processing be guaranteed. FlyingFish must/is a stable service that must not crash due to incorrect data transfer!

The [VTS library](https://github.com/OpenSourcePKG/vts) is used to create schemes. The company [Pegenau GmbH & Co. KG](https://www.pegenau.de/) has dedicated itself to the topic because there was no satisfactory solution in TypeScript.

{% hint style="info" %}
When creating a scheme, note the [creation of the name](object-name-rules.md#schema-objects)!
{% endhint %}

{% hint style="info" %}
All these schemas are collected in the "schemas" library. These are used in several FlyingFish part programs or in the API.
{% endhint %}

#### Definition

```typescript
/**
 * DomainRecord
 */
export const SchemaDomainRecord = Vts.object({
    id: Vts.number(),
    type: Vts.number(),
    class: Vts.number(),
    ttl: Vts.number(),
    value: Vts.string(),
    update_by_dnsclient: Vts.boolean(),
    last_update: Vts.number()
});

/**
 * DomainRecord
 */
export type DomainRecord = ExtractSchemaResultType<typeof SchemaDomainRecord>;
```

#### Validation

```typescript
const errors: SchemaErrors = [];

if (SchemaDomainRecord.validate(data, errors)) {
    console.log('Check is successful!')
}
```
