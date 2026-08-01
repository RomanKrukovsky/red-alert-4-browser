# SOURCE_RESEARCH

Дата проверки: 2026-08-01

## Что проверял

- Sketchfab: только официальные страницы и официальный `oEmbed` API для UID `91f495435f624d8b97a768f692aa6ce9`, `df32789800154ac08778a8db932d9184`, `2d01eba3031f4db48eea8cdcc504b366`, `7103a15d0c0141d6b3372e781e2f4e92`, `ae7ceaca7615424a91f0bd9a29ffc3d7`.
- Poly Haven: только официальные страницы, `info` API, `files` API и страница лицензии.
- Не обходил авторизацию. Для Sketchfab richer REST API в репозитории уже отмечен как `BLOCKED_AUTH`; ниже использованы только публичные страницы и публичный `oEmbed`.

## Короткий вывод

- Все 5 проверенных Sketchfab-ассетов помечены как `CC0` на официальных страницах/в `oEmbed`, и все 5 помечены как `Download Free 3D model`.
- Для Poly Haven все обязательные ассеты доступны на официальных страницах и в `files` API; лицензия Poly Haven прямо разрешает коммерческое использование, модификацию и перераспространение.
- Для Sketchfab право на коммерческое использование и модификацию подтверждаю через саму лицензию `CC0 1.0`, потому что на страницах ассетов видно именно метку `CC0`.

## Sketchfab

Общая лицензия для всех 5 объектов: [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/deed.en).  
Подтверждение прав по лицензии: [Creative Commons Public Domain / CC0](https://creativecommons.org/public-domain/).

| UID | Название | Автор | Платформа | Коммерческое использование | Модификация | Скачивание | Источники |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `91f495435f624d8b97a768f692aa6ce9` | Military Landvehicle Kit 1.2 (CC0) | britdawgmasterfunk | Sketchfab | Да, по CC0 | Да, по CC0 | Да, страница помечена как `Download Free 3D model` | [oEmbed](https://sketchfab.com/oembed?url=https://sketchfab.com/models/91f495435f624d8b97a768f692aa6ce9), [embed page](https://sketchfab.com/models/91f495435f624d8b97a768f692aa6ce9/embed) |
| `df32789800154ac08778a8db932d9184` | LPMAC military truck (CC0) | britdawgmasterfunk | Sketchfab | Да, по CC0 | Да, по CC0 | Да, страница помечена как `Download Free 3D model` | [oEmbed](https://sketchfab.com/oembed?url=https://sketchfab.com/models/df32789800154ac08778a8db932d9184), [embed page](https://sketchfab.com/models/df32789800154ac08778a8db932d9184/embed) |
| `2d01eba3031f4db48eea8cdcc504b366` | military_character_kit_1.1 FBX (CC0) | britdawgmasterfunk | Sketchfab | Да, по CC0 | Да, по CC0 | Да, страница помечена как `Download Free 3D model` | [oEmbed](https://sketchfab.com/oembed?url=https://sketchfab.com/models/2d01eba3031f4db48eea8cdcc504b366), [embed page](https://sketchfab.com/models/2d01eba3031f4db48eea8cdcc504b366/embed) |
| `7103a15d0c0141d6b3372e781e2f4e92` | Military_Character_Kit_Textured (CC0) | britdawgmasterfunk | Sketchfab | Да, по CC0 | Да, по CC0 | Да, страница помечена как `Download Free 3D model` | [oEmbed](https://sketchfab.com/oembed?url=https://sketchfab.com/models/7103a15d0c0141d6b3372e781e2f4e92), [embed page](https://sketchfab.com/models/7103a15d0c0141d6b3372e781e2f4e92/embed) |
| `ae7ceaca7615424a91f0bd9a29ffc3d7` | Military_Outpost_Kit_1.0 FBX (CC0) | britdawgmasterfunk | Sketchfab | Да, по CC0 | Да, по CC0 | Да, страница помечена как `Download Free 3D model` | [oEmbed](https://sketchfab.com/oembed?url=https://sketchfab.com/models/ae7ceaca7615424a91f0bd9a29ffc3d7), [embed page](https://sketchfab.com/models/ae7ceaca7615424a91f0bd9a29ffc3d7/embed) |

### Важная оговорка по Sketchfab

- Уверенность высокая по фактам `CC0`, автору и наличию скачивания: это видно в официальном `oEmbed` и заголовках официальных embed-страниц.
- Уверенность высокая по коммерческому использованию и модификации, но это именно вывод из лицензии `CC0 1.0`, а не отдельная формулировка на каждой странице модели.
- Официальный OAuth API Sketchfab без токена не использовал.

## Poly Haven: обязательный пакет

Общая лицензия для ассетов Poly Haven: [Poly Haven License](https://polyhaven.com/license).  
API: [Poly Haven API](https://polyhaven.com/our-api).

| Asset ID | Название | Автор(ы) | Платформа | Коммерческое использование | Модификация | URL лицензии | Скачивание | Источники |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `pine_tree_01` | Pine Tree 01 | Rob Tuytel; Rico Cilliers | Poly Haven | Да | Да | [Poly Haven License](https://polyhaven.com/license) | Да, есть прямые URL в `files` API | [page](https://polyhaven.com/a/pine_tree_01), [info](https://api.polyhaven.com/info/pine_tree_01), [files](https://api.polyhaven.com/files/pine_tree_01) |
| `coast_land_rocks_02` | Coast Land Rocks 02 | Rob Tuytel; Rico Cilliers | Poly Haven | Да | Да | [Poly Haven License](https://polyhaven.com/license) | Да, есть прямые URL в `files` API | [page](https://polyhaven.com/a/coast_land_rocks_02), [info](https://api.polyhaven.com/info/coast_land_rocks_02), [files](https://api.polyhaven.com/files/coast_land_rocks_02) |
| `concrete_road_barrier` | Concrete Road Barrier | Amal Kumar | Poly Haven | Да | Да | [Poly Haven License](https://polyhaven.com/license) | Да, есть прямые URL в `files` API | [page](https://polyhaven.com/a/concrete_road_barrier), [info](https://api.polyhaven.com/info/concrete_road_barrier), [files](https://api.polyhaven.com/files/concrete_road_barrier) |
| `old_military_crate` | Old Military Crate | Jack Mava | Poly Haven | Да | Да | [Poly Haven License](https://polyhaven.com/license) | Да, есть прямые URL в `files` API | [page](https://polyhaven.com/a/old_military_crate), [info](https://api.polyhaven.com/info/old_military_crate), [files](https://api.polyhaven.com/files/old_military_crate) |
| `concrete_floor_01` | Concrete Floor 01 | Rob Tuytel | Poly Haven | Да | Да | [Poly Haven License](https://polyhaven.com/license) | Да, есть прямые URL в `files` API | [page](https://polyhaven.com/a/concrete_floor_01), [info](https://api.polyhaven.com/info/concrete_floor_01), [files](https://api.polyhaven.com/files/concrete_floor_01) |
| `asphalt_01` | Asphalt 01 | Dario Barresi; Charlotte Baglioni | Poly Haven | Да | Да | [Poly Haven License](https://polyhaven.com/license) | Да, есть прямые URL в `files` API | [page](https://polyhaven.com/a/asphalt_01), [info](https://api.polyhaven.com/info/asphalt_01), [files](https://api.polyhaven.com/files/asphalt_01) |
| `rock_3` | Rock 3 | Rob Tuytel | Poly Haven | Да | Да | [Poly Haven License](https://polyhaven.com/license) | Да, есть прямые URL в `files` API | [page](https://polyhaven.com/a/rock_3), [info](https://api.polyhaven.com/info/rock_3), [files](https://api.polyhaven.com/files/rock_3) |
| `industrial_sunset_puresky` | Industrial Sunset (Pure Sky) | Jarod Guest; Sergej Majboroda | Poly Haven | Да | Да | [Poly Haven License](https://polyhaven.com/license) | Да, есть прямые URL в `files` API | [page](https://polyhaven.com/a/industrial_sunset_puresky), [info](https://api.polyhaven.com/info/industrial_sunset_puresky), [files](https://api.polyhaven.com/files/industrial_sunset_puresky) |

### Почему по Poly Haven ответ уверенный

- На [странице лицензии Poly Haven](https://polyhaven.com/license) прямо сказано, что ассеты можно использовать для любых целей, включая коммерческие, и что их можно перераспространять и включать в свои продукты.
- На [странице API](https://polyhaven.com/our-api) отдельно сказано, что API открыт и доступен, а `files` API реально возвращает прямые URL файлов.

## Poly Haven: подходящие грунты

Ниже не обязательный список, а практичные кандидаты под ту же военную/промышленную сцену. Это мой вывод по категориям и тегам в официальном API.

| Asset ID | Название | Почему подходит | Автор(ы) | Лицензия | Скачивание | Источники |
| --- | --- | --- | --- | --- | --- | --- |
| `sand_rocks_small_01` | Sand Rocks Small 01 | Песок, мелкие камни, shoreline/coastal теги; подходит для сухих краев карты и переходов | Rob Tuytel; Rico Cilliers | [Poly Haven License](https://polyhaven.com/license) | Да | [page](https://polyhaven.com/a/sand_rocks_small_01), [info](https://api.polyhaven.com/info/sand_rocks_small_01), [files](https://api.polyhaven.com/files/sand_rocks_small_01) |
| `coast_rocks_01` | Coast Rocks 01 | Каменистый грунт и переходы к скалам; подходит как rough edge terrain | Rob Tuytel; Rico Cilliers | [Poly Haven License](https://polyhaven.com/license) | Да | [page](https://polyhaven.com/a/coast_rocks_01), [info](https://api.polyhaven.com/info/coast_rocks_01), [files](https://api.polyhaven.com/files/coast_rocks_01) |
| `mountainside` | Mountainside | Скальный terrain/cliff для фона, откосов и краев карты | Dario Barresi; Rico Cilliers | [Poly Haven License](https://polyhaven.com/license) | Да | [page](https://polyhaven.com/a/mountainside), [info](https://api.polyhaven.com/info/mountainside), [files](https://api.polyhaven.com/files/mountainside) |

## Итог по решению

- Sketchfab: использовать можно, если устраивает опора на публичную метку `CC0` на официальных страницах и на саму лицензию CC0.
- Poly Haven: использовать можно уверенно; лицензия и доступность скачивания подтверждены официальной страницей лицензии и `files` API.
- Самая важная оставшаяся неопределенность только у Sketchfab: без OAuth я не подтверждал richer REST metadata, но для задачи лицензии/автора/наличия скачивания публичных официальных источников хватило.
