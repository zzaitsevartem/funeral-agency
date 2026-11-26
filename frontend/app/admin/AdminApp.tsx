"use client";

import { Admin, Resource } from "react-admin";
import { useState } from "react";

const apiUrl = "/api/admin";
async function getResourceItems(resource: string) {
  const response = await fetch(`${apiUrl}/${resource}?page=1&limit=100`, {
    credentials: "include",
  });
  const body = await response.json();
  if (!response.ok)
    throw new Error(body.error || "Не удалось загрузить данные");
  return (body.items ?? []).map((item: any) => ({
    ...item,
    id: item.id ?? item.orderId ?? item.paymentId,
  }));
}
const dataProvider = {
  getList: async (resource: string, params: any) => {
    const query = new URLSearchParams({
      page: String(params.pagination.page),
      limit: String(params.pagination.perPage),
    });
    if (params.filter?.q) query.set("q", params.filter.q);
    const response = await fetch(`${apiUrl}/${resource}?${query}`, {
      credentials: "include",
    });
    const body = await response.json();
    if (!response.ok)
      throw new Error(body.error || "Не удалось загрузить данные");
    const items = body.items ?? [];
    return {
      data: items.map((item: any) => ({
        ...item,
        priceRub: item.price == null ? undefined : item.price / 100,
        freeFromRub: item.freeFrom == null ? undefined : item.freeFrom / 100,
        imagesText: JSON.stringify(item.images ?? [], null, 2),
        attributesText: JSON.stringify(item.attributes ?? {}, null, 2),
        variantsText: JSON.stringify(
          (item.variants ?? []).map((variant: any) => ({
            ...variant,
            price: variant.price / 100,
          })),
          null,
          2,
        ),
        id: item.id ?? item.orderId ?? item.paymentId,
      })),
      total: body.total ?? items.length,
    };
  },
  getOne: async (resource: string, params: any) => {
    const response = await fetch(
      `${apiUrl}/${resource}/${encodeURIComponent(params.id)}`,
      { credentials: "include" },
    );
    const body = await response.json();
    if (!response.ok)
      throw new Error(body.error || "Не удалось загрузить запись");
    return {
      data: {
        ...body,
        priceRub: body.price == null ? undefined : body.price / 100,
        freeFromRub: body.freeFrom == null ? undefined : body.freeFrom / 100,
        imagesText: JSON.stringify(body.images ?? [], null, 2),
        attributesText: JSON.stringify(body.attributes ?? {}, null, 2),
        variantsText: JSON.stringify(
          (body.variants ?? []).map((variant: any) => ({
            ...variant,
            price: variant.price / 100,
          })),
          null,
          2,
        ),
        id: body.id ?? params.id,
      },
    };
  },
  getMany: async (resource: string, params: any) => {
    const items = await getResourceItems(resource);
    const ids = new Set(params.ids.map(String));
    return { data: items.filter((item: any) => ids.has(String(item.id))) };
  },
  getManyReference: async (resource: string, params: any) => {
    const items = await getResourceItems(resource);
    const matched = items.filter(
      (item: any) => String(item[params.target]) === String(params.id),
    );
    const start = (params.pagination.page - 1) * params.pagination.perPage;
    return {
      data: matched.slice(start, start + params.pagination.perPage),
      total: matched.length,
    };
  },
  create: async (resource: string, params: any) =>
    request(resource, "POST", await prepareData(params.data)),
  update: async (resource: string, params: any) => {
    const data = await prepareData(params.data);
    if (resource === "products" && Array.isArray(data.variants)) {
      const existing = params.previousData?.variants ?? [];
      const retained: string[] = [];
      for (const variant of data.variants) {
        const variantData = { ...variant };
        delete variantData.id;
        delete variantData.productId;
        delete variantData.active;
        if (variant.id) {
          retained.push(variant.id);
          await request(
            `products/${encodeURIComponent(params.id)}/variants/${encodeURIComponent(variant.id)}`,
            "PATCH",
            variantData,
          );
        } else
          await request(
            `products/${encodeURIComponent(params.id)}/variants`,
            "POST",
            variantData,
          );
      }
      for (const variant of existing)
        if (variant.id && !retained.includes(variant.id))
          await request(
            `products/${encodeURIComponent(params.id)}/variants/${encodeURIComponent(variant.id)}`,
            "DELETE",
          );
      delete data.variants;
    }
    return request(
      `${resource}/${encodeURIComponent(params.id)}`,
      "PATCH",
      data,
    );
  },
  delete: async (resource: string, params: any) => {
    await request(`${resource}/${encodeURIComponent(params.id)}`, "DELETE");
    return { data: { id: params.id } };
  },
};

async function prepareData(data: any) {
  const result = { ...data };
  if (typeof result.priceRub === "number") {
    result.price = Math.round(result.priceRub * 100);
    delete result.priceRub;
  }
  if (typeof result.freeFromRub === "number") {
    result.freeFrom = Math.round(result.freeFromRub * 100);
    delete result.freeFromRub;
  }
  if (typeof result.imagesText === "string") {
    result.images = JSON.parse(result.imagesText || "[]");
    delete result.imagesText;
  }
  if (typeof result.attributesText === "string") {
    result.attributes = JSON.parse(result.attributesText || "{}");
    delete result.attributesText;
  }
  if (typeof result.variantsText === "string") {
    result.variants = JSON.parse(result.variantsText || "[]").map(
      (variant: any) => ({
        ...variant,
        price: Math.round(Number(variant.price) * 100),
      }),
    );
    delete result.variantsText;
  }
  if (result.photo) {
    const files = Array.isArray(result.photo) ? result.photo : [result.photo];
    const uploaded: string[] = [];
    for (const item of files) {
      if (!(item?.rawFile instanceof File)) continue;
      const file = item.rawFile as File;
      const response = await fetch(`${apiUrl}/uploads`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error || "Не удалось загрузить фото");
      uploaded.push(body.url);
    }
    result.images = [...(result.images ?? []), ...uploaded];
    delete result.photo;
  }
  return result;
}

async function request(path: string, method: string, data?: any) {
  const sendsJson = data !== undefined || method === "DELETE";
  const response = await fetch(`${apiUrl}/${path}`, {
    method,
    credentials: "include",
    headers: sendsJson ? { "Content-Type": "application/json" } : undefined,
    body:
      data !== undefined
        ? JSON.stringify(data)
        : method === "DELETE"
          ? "{}"
          : undefined,
  });
  const body = response.status === 204 ? {} : await response.json();
  if (!response.ok) throw new Error(body.error || "Операция не выполнена");
  return { data: { ...body, id: body.id ?? body.orderId ?? body.paymentId } };
}

const authProvider = {
  login: async ({ username, password }: any) => {
    const response = await fetch(`${apiUrl}/login`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: username, password }),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "Проверьте email и пароль");
  },
  logout: async () => {
    const response = await fetch(`${apiUrl}/logout`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    if (!response.ok && response.status !== 401) throw new Error("Не удалось завершить сеанс");
    window.location.replace("/");
  },
  checkAuth: async () => {
    const response = await fetch(`${apiUrl}/session`, {
      credentials: "include",
    });
    if (!response.ok) throw new Error("Требуется вход");
  },
  checkError: async ({ status }: any) => {
    if (status === 401 || status === 403) throw new Error("Сессия завершена");
  },
  getIdentity: async () => {
    const response = await fetch(`${apiUrl}/session`, {
      credentials: "include",
    });
    const data = await response.json();
    return { id: data.email, fullName: data.email };
  },
  getPermissions: async () => null,
};

const russian = {
  resources: {
    products: {
      name: "Товары",
      action: {
        create: "Добавить товар",
        edit: "Изменить",
        show: "Открыть",
        delete: "Снять с публикации",
        list: "К списку",
      },
      page: {
        list: "Товары",
        create: "Добавить товар",
        edit: "Редактировать товар",
      },
      notifications: {
        created: "Товар создан",
        updated: "Товар сохранён",
        deleted: "Товар снят с публикации",
      },
    },
    categories: {
      name: "Категории",
      action: {
        create: "Добавить категорию",
        edit: "Изменить",
        show: "Открыть",
        delete: "Удалить",
        list: "К списку",
      },
      page: {
        list: "Категории",
        create: "Добавить категорию",
        edit: "Редактировать категорию",
      },
      notifications: {
        created: "Категория создана",
        updated: "Категория сохранена",
        deleted: "Категория удалена",
      },
    },
    orders: {
      name: "Заказы",
      action: { edit: "Изменить статус", show: "Открыть", list: "К списку" },
      page: { list: "Заказы", edit: "Заказ" },
      notifications: { updated: "Статус заказа сохранён" },
    },
    payments: {
      name: "Платежи",
      action: { show: "Открыть", list: "К списку" },
      page: { list: "Платежи", show: "Платёж" },
    },
    delivery: {
      name: "Тарифы доставки",
      action: { edit: "Изменить", list: "К списку" },
      page: { list: "Тарифы доставки", edit: "Тариф доставки" },
    },
    pages: {
      name: "Контент",
      action: {
        create: "Добавить страницу",
        edit: "Изменить",
        show: "Открыть",
        list: "К списку",
      },
      page: {
        list: "Контент",
        create: "Добавить страницу",
        edit: "Редактировать страницу",
      },
      notifications: {
        created: "Страница создана",
        updated: "Страница сохранена",
      },
    },
    "contact-requests": {
      name: "Обращения",
      action: { show: "Открыть", list: "К списку" },
      page: { list: "Обращения", show: "Обращение" },
    },
  },
  ra: {
    action: {
      create: "Добавить",
      edit: "Изменить",
      delete: "Удалить",
      save: "Сохранить",
      cancel: "Отмена",
      show: "Открыть",
      list: "Список",
      search: "Поиск",
      export: "Экспорт",
    },
    navigation: { no_results: "Ничего не найдено" },
    page: { dashboard: "Обзор", loading: "Загрузка…", error: "Ошибка" },
    notification: {
      updated: "Изменения сохранены",
      created: "Запись создана",
      deleted: "Запись удалена",
    },
    auth: {
      username: "Email",
      password: "Пароль",
      sign_in: "Войти",
      sign_in_error: "Не удалось войти",
      user_menu: "Профиль",
      logout: "Выйти",
    },
    input: {
      file: {
        upload_several: "Перетащите фото или нажмите для выбора",
        upload_single: "Выберите файл",
      },
    },
    page_title: {
      create: "Добавить %{name}",
      edit: "Изменить %{name}",
      list: "%{name}",
      show: "%{name}",
    },
    message: {
      invalid_form: "Проверьте заполнение формы",
      access_denied: "Нет доступа",
      loading: "Загрузка…",
      empty: "Записей пока нет",
      no_results: "Ничего не найдено",
      not_found: "Запись не найдена",
    },
  },
};
const i18nProvider = {
  translate: (key: string, options?: Record<string, unknown>) => {
    const value = key
      .split(".")
      .reduce((node: any, part) => node?.[part], russian);
    if (typeof value !== "string") return String(options?._ ?? key);
    return value.replace(/%\{(\w+)\}/g, (_match, name) =>
      String(options?.[name] ?? ""),
    );
  },
  getLocale: () => "ru",
  changeLocale: async () => undefined,
};

function AdminApp() {
  return (
    <Admin
      dataProvider={dataProvider as any}
      authProvider={authProvider as any}
      i18nProvider={i18nProvider as any}
      disableTelemetry
      loginPage={false}
    >
      <Resource
        name="products"
        list={ProductList}
        create={ProductCreate}
        edit={ProductEdit}
      />
      <Resource
        name="categories"
        list={CategoryList}
        create={CategoryCreate}
        edit={CategoryEdit}
      />
      <Resource
        name="orders"
        list={OrderList}
        show={OrderShow}
        edit={OrderEdit}
      />
      <Resource name="payments" list={PaymentList} show={PaymentShow} />
      <Resource name="delivery" list={DeliveryList} edit={DeliveryEdit} />
      <Resource
        name="pages"
        list={PageList}
        create={PageCreate}
        edit={PageEdit}
      />
      <Resource name="contact-requests" list={ContactRequestList} show={ContactRequestShow} />
    </Admin>
  );
}

import {
  Create,
  Edit,
  SimpleForm,
  TextInput,
  NumberInput,
  BooleanInput,
  SelectInput,
  ReferenceInput,
  AutocompleteInput,
  ImageInput,
  ImageField,
  List,
  Datagrid,
  TextField,
  NumberField,
  BooleanField,
  DateField,
  Show,
  SimpleShowLayout,
  EditButton,
  ShowButton,
  DeleteButton,
  required,
  FunctionField,
  ReferenceField,
  useRecordContext,
} from "react-admin";

function ProductList() {
  return (
    <List>
      <Datagrid rowClick="edit">
        <TextField source="name" label="Название" />
        <TextField source="sku" label="Артикул" />
        <FunctionField
          label="Цена"
          render={(record: any) => moneyRub(record.price)}
        />
        <BooleanField source="active" label="Опубликован" />
        <EditButton />
        <DeleteButton label="Снять с публикации" mutationMode="pessimistic" />
      </Datagrid>
    </List>
  );
}
function PriceInput() {
  return (
    <NumberInput
      source="priceRub"
      label="Цена, ₽"
      min={0}
      step={0.01}
      validate={required()}
    />
  );
}
function ProductFields() {
  return (
    <>
      <TextInput source="name" label="Название товара" validate={required()} />
      <TextInput source="sku" label="Артикул" validate={required()} />
      <ReferenceInput
        source="categoryId"
        reference="categories"
        label="Категория"
      >
        <AutocompleteInput
          label="Категория"
          optionText="name"
          validate={required()}
        />
      </ReferenceInput>
      <PriceInput />
      <TextInput source="description" label="Описание" multiline fullWidth />
      <TextInput source="slug" label="Адрес страницы" validate={required()} />
      <BooleanInput source="active" label="Опубликован" />
      <TextInput
        source="imagesText"
        label="Фотографии (JSON-массив URL)"
        multiline
        fullWidth
        helperText="Фото можно загрузить ниже; URL поддерживаются как список в формате JSON."
      />
      <ProductGallery />
      <ImageInput
        source="photo"
        label="Загрузить фото"
        accept={{ "image/*": [] }}
        multiple
      >
        <ImageField source="src" title="title" />
      </ImageInput>
      <TextInput
        source="attributesText"
        label="Характеристики (JSON)"
        multiline
        fullWidth
        helperText='Например: {"Размер":"180 × 60 см","Цвет":"бордовый"}'
      />
      <TextInput
        source="variantsText"
        label="Варианты (JSON; цена в рублях)"
        multiline
        fullWidth
        helperText='Например: [{"name":"Размер 180 см","sku":"ABC-180","price":12500,"attributes":{"Размер":"180 см"}}]'
      />
    </>
  );
}
function ProductGallery() {
  const record = useRecordContext();
  const images: string[] = record?.images ?? [];
  return (
    <div
      aria-label="Галерея товара"
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 12,
        margin: "8px 0 20px",
      }}
    >
      {images.map((src, index) => (
        <img
          key={`${src}-${index}`}
          src={src}
          alt={`Фото ${index + 1}`}
          style={{
            width: 92,
            height: 92,
            objectFit: "cover",
            borderRadius: 6,
            border: "1px solid #ddd",
          }}
        />
      ))}
    </div>
  );
}
function ProductCreate() {
  return (
    <Create>
      <SimpleForm>
        <ProductFields />
      </SimpleForm>
    </Create>
  );
}
function ProductEdit() {
  return (
    <Edit>
      <SimpleForm>
        <ProductFields />
      </SimpleForm>
    </Edit>
  );
}
function CategoryList() {
  return (
    <List>
      <Datagrid rowClick="edit">
        <TextField source="name" label="Название" />
        <TextField source="path" label="Адрес" />
        <ReferenceField
          source="parentId"
          reference="categories"
          label="Родитель"
          link={false}
        >
          <TextField source="name" />
        </ReferenceField>
        <NumberField source="sortOrder" label="Порядок" />
        <EditButton />
        <DeleteButton mutationMode="pessimistic" />
      </Datagrid>
    </List>
  );
}
function CategoryFields({
  disableParent = false,
}: {
  disableParent?: boolean;
}) {
  return (
    <>
      <TextInput
        source="name"
        label="Название категории"
        validate={required()}
      />
      <TextInput source="slug" label="Короткий адрес" validate={required()} />
      <ReferenceInput
        source="parentId"
        reference="categories"
        label="Родительская категория"
      >
        <AutocompleteInput
          label="Родительская категория"
          optionText="name"
          disabled={disableParent}
        />
      </ReferenceInput>
      <TextInput source="description" label="Описание" multiline fullWidth />
      <TextInput source="image" label="URL изображения" />
      <NumberInput source="sortOrder" label="Порядок" />
    </>
  );
}
function CategoryCreate() {
  return (
    <Create>
      <SimpleForm>
        <CategoryFields />
      </SimpleForm>
    </Create>
  );
}
function CategoryEdit() {
  return (
    <Edit>
      <SimpleForm>
        <CategoryFields disableParent />
      </SimpleForm>
    </Edit>
  );
}
const moneyRub = (value: number | null | undefined) =>
  value == null
    ? "—"
    : new Intl.NumberFormat("ru-RU", {
        style: "currency",
        currency: "RUB",
      }).format(value / 100);
function DeliveryList() {
  return (
    <List>
      <Datagrid rowClick="edit">
        <TextField source="name" label="Способ доставки" />
        <FunctionField
          label="Тариф"
          render={(record: any) => moneyRub(record.price)}
        />
        <FunctionField
          label="Бесплатно от"
          render={(record: any) => moneyRub(record.freeFrom)}
        />
        <BooleanField source="active" label="Включён" />
        <EditButton />
      </Datagrid>
    </List>
  );
}
function DeliveryEdit() {
  return (
    <Edit>
      <SimpleForm>
        <TextInput
          source="name"
          label="Способ доставки"
          validate={required()}
        />
        <TextInput source="description" label="Описание" multiline fullWidth />
        <NumberInput
          source="priceRub"
          label="Стоимость, ₽"
          min={0}
          step={0.01}
        />
        <NumberInput
          source="freeFromRub"
          label="Бесплатно от, ₽"
          min={0}
          step={0.01}
        />
        <BooleanInput source="active" label="Включён" />
      </SimpleForm>
    </Edit>
  );
}
function PageList() {
  return (
    <List>
      <Datagrid rowClick="edit">
        <TextField source="title" label="Заголовок" />
        <TextField source="slug" label="Адрес" />
        <BooleanField source="active" label="Опубликована" />
        <EditButton />
      </Datagrid>
    </List>
  );
}
function PageFields({ editing = false }: { editing?: boolean }) {
  return (
    <>
      <TextInput
        source="slug"
        label="Адрес страницы"
        disabled={editing}
        validate={required()}
      />
      <TextInput source="title" label="Заголовок" validate={required()} />
      <TextInput source="body" label="Текст страницы" multiline fullWidth />
      <BooleanInput source="active" label="Опубликована" />
    </>
  );
}
function PageCreate() {
  return (
    <Create>
      <SimpleForm>
        <PageFields />
      </SimpleForm>
    </Create>
  );
}
function PageEdit() {
  return (
    <Edit>
      <SimpleForm>
        <PageFields editing />
      </SimpleForm>
    </Edit>
  );
}
const orderStatusLabels: Record<string, string> = {
  new: "Новый",
  processing: "В обработке",
  completed: "Выполнен",
  cancelled: "Отменён",
};
const paymentStatusLabels: Record<string, string> = {
  pending: "Ожидает оплаты",
  paid: "Оплачен",
  failed: "Ошибка",
  cancelled: "Отменён",
  refunded: "Возвращён",
};
function OrderList() {
  return (
    <List>
      <Datagrid rowClick="show">
        <TextField source="number" label="№ заказа" />
        <TextField source="name" label="Покупатель" />
        <FunctionField
          label="Статус заказа"
          render={(record: any) =>
            orderStatusLabels[record.status] ?? record.status
          }
        />
        <FunctionField
          label="Оплата"
          render={(record: any) =>
            paymentStatusLabels[record.paymentStatus] ?? record.paymentStatus
          }
        />
        <FunctionField
          label="Сумма"
          render={(record: any) => moneyRub(record.total)}
        />
        <DateField source="createdAt" label="Создан" />
        <ShowButton />
        <EditButton />
      </Datagrid>
    </List>
  );
}

function ContactRequestList() {
  return (
    <List>
      <Datagrid rowClick="show">
        <TextField source="name" label="Имя" />
        <TextField source="phone" label="Телефон" />
        <TextField source="email" label="Email" />
        <DateField source="createdAt" label="Получено" showTime />
        <ShowButton />
      </Datagrid>
    </List>
  );
}

function ContactRequestShow() {
  return (
    <Show>
      <SimpleShowLayout>
        <TextField source="name" label="Имя" />
        <TextField source="phone" label="Телефон" />
        <TextField source="email" label="Email" />
        <TextField source="message" label="Сообщение" />
        <DateField source="consentAt" label="Согласие получено" showTime />
        <DateField source="createdAt" label="Обращение получено" showTime />
      </SimpleShowLayout>
    </Show>
  );
}
const orderStatuses = [
  { id: "new", name: "Новый" },
  { id: "processing", name: "В обработке" },
  { id: "completed", name: "Выполнен" },
  { id: "cancelled", name: "Отменён" },
];
function OrderEdit() {
  return (
    <Edit>
      <SimpleForm>
        <TextInput source="number" label="№ заказа" disabled />
        <TextInput source="name" label="Покупатель" disabled />
        <TextInput source="phone" label="Телефон" disabled />
        <TextInput source="email" label="Email" disabled />
        <SelectInput
          source="status"
          label="Статус заказа"
          choices={orderStatuses}
          validate={required()}
        />
        <TextInput source="paymentStatus" label="Статус оплаты" disabled />
        <NumberInput source="total" label="Сумма, копейки" disabled />
      </SimpleForm>
    </Edit>
  );
}
function OrderShow() {
  return (
    <Show>
      <SimpleShowLayout>
        <TextField source="number" label="№ заказа" />
        <FunctionField
          label="Статус"
          render={(record: any) =>
            orderStatusLabels[record.status] ?? record.status
          }
        />
        <FunctionField
          label="Статус оплаты"
          render={(record: any) =>
            paymentStatusLabels[record.paymentStatus] ?? record.paymentStatus
          }
        />
        <FunctionField
          label="Способ оплаты"
          render={(record: any) =>
            record.paymentMethod === "online" ? "Онлайн" : "Наличные курьеру"
          }
        />
        <TextField source="name" label="Покупатель" />
        <TextField source="email" label="Email" />
        <TextField source="phone" label="Телефон" />
        <TextField source="city" label="Город" />
        <TextField source="address" label="Адрес" />
        <TextField source="comment" label="Комментарий" />
        <FunctionField
          label="Состав заказа"
          render={(record: any) =>
            (record.lines ?? [])
              .map(
                (line: any) =>
                  `${line.name} × ${line.quantity} — ${moneyRub(line.total)}`,
              )
              .join("; ") || "—"
          }
        />
        <FunctionField
          label="Итого"
          render={(record: any) => moneyRub(record.total)}
        />
      </SimpleShowLayout>
    </Show>
  );
}
function PaymentList() {
  return (
    <List>
      <Datagrid rowClick="show">
        <TextField source="id" label="Платёж" />
        <TextField source="order.number" label="№ заказа" />
        <FunctionField
          label="Статус платежа"
          render={(record: any) =>
            paymentStatusLabels[record.status] ?? record.status
          }
        />
        <FunctionField
          label="Сумма"
          render={(record: any) => moneyRub(record.amount)}
        />
        <DateField source="createdAt" label="Создан" />
        <FunctionField
          label="Метод оплаты"
          render={(record: any) =>
            record.method === "test" ? "Тестовая оплата" : record.method
          }
        />
        <ShowButton />
      </Datagrid>
    </List>
  );
}
function PaymentShow() {
  return (
    <Show>
      <SimpleShowLayout>
        <TextField source="id" label="Платёж" />
        <TextField source="order.number" label="Связанный заказ" />
        <FunctionField
          label="Статус платежа"
          render={(record: any) =>
            paymentStatusLabels[record.status] ?? record.status
          }
        />
        <FunctionField
          label="Сумма"
          render={(record: any) => moneyRub(record.amount)}
        />
        <FunctionField
          label="Метод оплаты"
          render={(record: any) =>
            record.method === "test" ? "Тестовая оплата" : record.method
          }
        />
        <DateField source="createdAt" label="Создан" />
        <FunctionField
          label="Режим"
          render={(record: any) =>
            record.method === "test" ? "Тестовый платёж" : "Только просмотр"
          }
        />
      </SimpleShowLayout>
    </Show>
  );
}

export default AdminApp;
