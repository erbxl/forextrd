import { expect,test,type Page } from "@playwright/test";
import { getModuleLessons, exams } from "../../src/modules/academy/content";
import type { Lesson } from "../../src/modules/academy/types";

async function solve(page:Page,lesson:Lesson) {
  for(const [index,question] of lesson.questions.entries()) {
    const group=page.locator("fieldset.question-card").nth(index);
    if(question.type==="number" || question.type==="text")await group.getByRole("textbox").fill(String(question.answer));
    else if(question.type==="order") {
      const current=[...question.options!];const expected=String(question.answer).split(" | ");
      for(const [destination,step] of expected.entries()){let from=current.indexOf(step);while(from>destination){await group.getByRole("button",{name:`Subir ${step}`,exact:true}).click();[current[from-1],current[from]]=[current[from],current[from-1]];from--;}}
      await group.getByRole("button",{name:/^(Confirmar orden|Orden confirmado)$/}).click();
    }else await group.getByRole("radio").nth(question.options!.indexOf(String(question.answer))).check();
  }
  await page.getByRole("button",{name:"Corregir y guardar respuestas",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Evaluación superada",exact:true})).toBeVisible();
  await page.getByRole("checkbox",{name:"He estudiado la explicación y revisado mis respuestas."}).check();
  await page.getByRole("button",{name:lesson.kind==="exam" ? "Completar nivel" : "Completar lección",exact:true}).click();
  await expect(page.getByRole("heading",{name:lesson.kind==="exam" ? "Nivel completado" : "Lección completada",exact:true})).toBeVisible();
}

test("completar el nivel 0 y su examen desbloquea el nivel 1 y persiste al recargar",async({page})=>{
  test.setTimeout(180000);const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));const next=getModuleLessons(1)[0];
  await page.goto(`academia/${next.slug}/`);await expect(page.getByText("UNIDAD BLOQUEADA",{exact:true})).toBeVisible();
  await page.goto(`academia/${exams[0].slug}/`);await expect(page.getByText("UNIDAD BLOQUEADA",{exact:true})).toBeVisible();
  for(const lesson of getModuleLessons(0)){await page.goto(`academia/${lesson.slug}/`);await expect(page.getByRole("heading",{name:lesson.title,exact:true})).toBeVisible();await solve(page,lesson);}
  await page.goto("academia/");const module=page.locator("#nivel-0");await expect(module.getByRole("link",{name:/Examen final del nivel 0/})).toBeVisible();
  await page.goto(`academia/${exams[0].slug}/`);await solve(page,exams[0]);
  await page.getByRole("link",{name:`Continuar: ${next.title}`,exact:true}).click();await expect(page.getByRole("heading",{name:next.title,exact:true})).toBeVisible();await expect(page.getByText("UNIDAD BLOQUEADA",{exact:true})).toHaveCount(0);
  await page.reload();await expect(page.getByRole("heading",{name:next.title,exact:true})).toBeVisible();await expect(page.getByText("UNIDAD BLOQUEADA",{exact:true})).toHaveCount(0);
  await page.goto("progreso/");await expect(page.getByText("1 de 13 niveles completados.",{exact:true})).toBeVisible();expect(errors).toEqual([]);
});

test("calculadoras explican resultados y rechazan stops invertidos",async({page})=>{
  await page.goto("herramientas/");await page.getByRole("button",{name:"Calcular y explicar"}).click();await expect(page.getByRole("status")).toContainText("50");
  await page.getByRole("button",{name:/Tamaño de posición/}).click();await page.getByRole("button",{name:"Calcular y explicar"}).click();await expect(page.getByRole("status")).toContainText("0,38");await expect(page.getByRole("status")).toContainText("97,66");
  await page.getByRole("button",{name:/Riesgo y beneficio/}).click();await page.getByLabel("Stop",{exact:true}).fill("1.09");await page.getByRole("button",{name:"Calcular y explicar"}).click();await expect(page.locator(".calculator-workspace").getByRole("alert")).toContainText("lados opuestos");
});

test("diario guarda, edita y conserva una pérdida con plan respetado",async({page})=>{
  await page.goto("diario/");await page.getByLabel("Estrategia",{exact:true}).fill("Plan E2E");await page.getByLabel("Precio de salida",{exact:true}).fill("1.078");await page.getByLabel("Seguí todas las reglas de mi plan.").check();await page.getByRole("button",{name:"Guardar operación",exact:true}).click();await expect(page.getByText("Entrada guardada en tu diario.",{exact:true})).toBeVisible();await expect(page.getByRole("cell",{name:"Plan respetado",exact:true})).toBeVisible();
  await page.reload();await expect(page.getByRole("cell",{name:/EUR\/USDPlan E2E/})).toBeVisible();await page.getByRole("button",{name:"Editar",exact:true}).click();await page.getByLabel("Notas y aprendizaje").fill("Pérdida siguiendo el plan");await page.getByRole("button",{name:"Guardar operación",exact:true}).click();await expect(page.getByText("Entrada guardada en tu diario.",{exact:true})).toBeVisible();
});

test("glosario y mentor recuperan conceptos reales del currículo",async({page})=>{
  await page.goto("glosario/");await page.getByRole("textbox",{name:"Buscar en el glosario"}).fill("pip");await expect(page.locator(".glossary-entry").first()).toBeVisible();
  await page.goto("mentor/");await page.getByRole("textbox",{name:"Consulta al mentor"}).fill("valor del pip");await page.getByRole("button",{name:"Consultar el temario",exact:true}).click();await expect(page.getByRole("heading",{name:"Conceptos relacionados",exact:true})).toBeVisible();await expect(page.getByRole("link",{name:"Estudiar la unidad completa"}).first()).toBeVisible();
});
