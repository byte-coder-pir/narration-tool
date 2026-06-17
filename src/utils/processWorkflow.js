import {
  formatKey,
  formatConstraint,
  formatExceptionType,
  formatSelector,
  formatUnit,
} from "./formatters.js";

/* ----------------------------------------------------------------
   processWorkflow
   Takes a parsed workflow object (wf) and appends row objects
   into csvRows.
---------------------------------------------------------------- */
export const processWorkflow = (wf, csvRows) => {
  const parameterMap = {};
  const propertyNameMap = {};
  const optionMap = {};
  const visibilityMap = {};

  // ---------- BUILD TASK MAP ----------
  // Task `id` fields arrive as JSON strings → preserved exactly.
  // `prerequisiteTaskIds` arrive as JSON numbers → JS loses precision
  // on large integers (e.g. 748955775299330048 → 748955775299330000).
  // Fix: store BOTH the exact string key AND the number-truncated key
  // so that lookups from either source always hit.
  const taskMap = {};
  wf.stageRequests?.forEach((stage, si) => {
    const stageOrder = stage.orderTree ?? si + 1;
    stage.taskRequests?.forEach((task, ti) => {
      const taskOrder = task.orderTree ?? ti + 1;
      const taskInfo = { taskName: task.name, stageName: stage.name, stageOrder, taskOrder };
      const exactKey = String(task.id);
      taskMap[exactKey] = taskInfo;
      // Also store the float-truncated version so number-typed IDs resolve
      const truncatedKey = String(Number(task.id));
      if (truncatedKey !== exactKey) taskMap[truncatedKey] = taskInfo;
    });
  });

  const lookupTask = (id) => taskMap[String(id)] ?? null;

  // ---------- FILTERS ----------
  const getFiltersText = (param) => {
    const fields = param?.data?.propertyFilters?.fields;
    if (!fields?.length) return "";

    const SELECTOR_LABEL = {
      CONSTANT: "Constant", PARAMETER: "Parameter",
      PROPERTY: "Property", VARIABLE: "Variable", EXPRESSION: "Expression",
    };

    return fields
      .map((f, idx) => {
        const parts = [];
        const HEX_ID = /^[a-f0-9]{24}$/i;
        const selectorUp = f.selector?.toUpperCase();

        // Filter Type
        if (f.selector) {
          parts.push(`Filter Type: ${SELECTOR_LABEL[selectorUp] || f.selector}`);
        }

        // Source — "Ontology" for unresolvable backend IDs, param name for form references
        if (selectorUp === "PARAMETER" && f.referencedParameterId) {
          const name = parameterMap[f.referencedParameterId];
          if (name) parts.push(`Source: ${name}`);
        } else if (f.values?.length) {
          const allResolved = f.values.every((v) =>
            !(typeof v === "string" && HEX_ID.test(v)) ||
            optionMap[v] || propertyNameMap[v]
          );
          if (allResolved) {
            const names = f.values
              .map((v) => (typeof v === "string" && HEX_ID.test(v) ? optionMap[v] || propertyNameMap[v] : v))
              .filter(Boolean);
            if (names.length) parts.push(`Source: ${names.join(", ")}`);
          } else {
            parts.push(`Source: Ontology`);
          }
        }

        return `Filter ${idx + 1}:\n  ${parts.join("\n  ")}`;
      })
      .join("\n\n");
  };

  // ---------- VALIDATIONS ----------
  const getValidationsText = (param) => {
    if (!param?.validations?.length) return "";
    const all = [];

    param.validations.forEach((validation) => {
      const exType = formatExceptionType(validation.exceptionApprovalType);

      const processArray = (arr, typeName) => {
        arr?.forEach((v, idx) => {
          const parts = [`${typeName} ${idx + 1}:`, `  Exception Type: ${exType}`];

          if (v.constraint) parts.push(`  Condition: ${formatConstraint(v.constraint)}`);
          if (v.selector) parts.push(`  Selector: ${formatSelector(v.selector)}`);

          if (v.value !== undefined && v.value !== null) {
            let val = v.value;
            if (
              v.selector?.toUpperCase() === "CONSTANT" &&
              typeof val === "string" &&
              /^[a-f0-9]{24}$/.test(val)
            ) {
              val = optionMap[val] || propertyNameMap[val] || val;
            }
            parts.push(`  Value: ${val}`);
          }

          if (v.dateUnit) parts.push(`  Unit: ${formatUnit(v.dateUnit)}`);
          if (v.errorMessage) parts.push(`  Error Message: "${v.errorMessage}"`);

          if (v.referencedParameterId) {
            parts.push(
              `  Referenced Parameter: ${parameterMap[v.referencedParameterId] || v.referencedParameterId}`
            );
          }

          if (v.propertyId) {
            const propName =
              propertyNameMap[v.propertyId] ||
              (!/^[a-f0-9]{24}$/.test(String(v.propertyId)) ? v.propertyId : null);
            if (propName) parts.push(`  Property: ${propName}`);
          }

          if (v.parameterLabel) parts.push(`  Parameter: ${v.parameterLabel}`);
          if (v.minValue !== undefined) parts.push(`  Min Value: ${v.minValue}`);
          if (v.maxValue !== undefined) parts.push(`  Max Value: ${v.maxValue}`);

          all.push(parts.join("\n"));
        });
      };

      processArray(validation.dateTimeParameterValidations, "Date/Time Validation");
      processArray(validation.criteriaValidations, "Criteria Validation");
      processArray(validation.propertyValidations, "Property Validation");
      processArray(validation.resourceParameterValidations, "Resource Validation");
      processArray(validation.relationPropertyValidations, "Relation Validation");

      if (validation.customValidations) {
        const parts = ["Custom Validation:", `  Exception Type: ${exType}`];
        if (typeof validation.customValidations === "object") {
          Object.entries(validation.customValidations).forEach(([k, v]) =>
            parts.push(`  ${formatKey(k)}: ${JSON.stringify(v)}`)
          );
        } else {
          parts.push(`  Details: ${validation.customValidations}`);
        }
        all.push(parts.join("\n"));
      }
    });

    return all.join("\n\n");
  };

  // ---------- DEPENDENCIES ----------
  const getDependenciesText = (task) => {
    const prereqs = task?.prerequisiteTaskIds;
    if (!prereqs?.length) return "N/A";

    const lines = prereqs.map((id) => {
      const info = lookupTask(id);
      return info
        ? `Stage ${info.stageOrder}: ${info.stageName}\n  → Task ${info.stageOrder}.${info.taskOrder}: ${info.taskName}`
        : null;
    }).filter(Boolean);

    if (!lines.length) return "N/A";
    return `Tasks that need to be executed before this task:\n${lines.join("\n")}`;
  };

  // ---------- EXECUTOR LOCK ----------
  const getExecutorLockText = (task) => {
    const lock = task?.taskExecutorLock;
    if (!lock) return "N/A";
    const lines = [];

    if (lock.hasToBeExecutorId) {
      const info = lookupTask(lock.hasToBeExecutorId);
      if (info) lines.push(`Must be executed by same person as:\n  Task ${info.stageOrder}.${info.taskOrder}: ${info.taskName} (${info.stageName})`);
    }

    if (lock.cannotBeExecutorIds?.length) {
      const list = lock.cannotBeExecutorIds.map((id) => {
        const info = lookupTask(id);
        return info
          ? `Task ${info.stageOrder}.${info.taskOrder}: ${info.taskName} (${info.stageName})`
          : null;
      }).filter(Boolean);
      if (list.length) lines.push(`Cannot be executed by same person as:\n  ${list.join("\n  ")}`);
    }

    return lines.length ? lines.join("\n\n") : "N/A";
  };

  // ---------- AUTOMATIONS ----------
  const buildAutomationText = (task) => {
    if (!task?.automationRequests?.length) return "";

    return task.automationRequests
      .map((auto) => {
        const trigger = (auto.triggerType || "").replace(/_/g, " ").toLowerCase();
        const action = (auto.actionType || "").replace(/_/g, " ").toLowerCase();
        const name = auto.displayName || "Unnamed Automation";

        let objectType =
          auto.actionDetails?.objectTypeDisplayName || "Unknown Object Type";

        if (objectType === "Unknown Object Type" && auto.actionDetails?.referencedParameterId) {
          const refId = auto.actionDetails.referencedParameterId;
          const refParam =
            wf.parameterRequests?.find((p) => p.id === refId) ||
            wf.stageRequests
              ?.flatMap((s) => s.taskRequests || [])
              .flatMap((t) => t.parameterRequests || [])
              .find((p) => p.id === refId);
          if (refParam?.data?.collection) objectType = refParam.data.collection;
        }

        const mappings =
          auto.actionDetails?.configuration
            ?.map((cfg) => {
              const label =
                cfg.parameterLabel ||
                cfg.parameterDisplayName ||
                propertyNameMap[cfg.parameterId] ||
                "";
              return label ? `• ${label}` : "";
            })
            .filter(Boolean)
            .join("\n") || "";

        return [
          `Automation: ${name}`,
          `Trigger: ${trigger}`,
          `Action: ${action}`,
          `Object Type: ${objectType}`,
          mappings ? `Parameters to be automated:\n${mappings}` : "",
        ]
          .filter(Boolean)
          .join("\n");
      })
      .join("\n\n");
  };

  // ---------- PARAM COLLECTION ----------
  const collectParam = (param) => {
    if (!param) return;
    parameterMap[param.id] = param.label;
    propertyNameMap[param.id] = param.label;

    const options = Array.isArray(param.data)
      ? param.data
      : Array.isArray(param.data?.choices)
      ? param.data.choices
      : Array.isArray(param.data?.options)
      ? param.data.options
      : [];

    options.forEach((opt) => {
      if (opt?.id) optionMap[opt.id] = opt.name ?? opt.label ?? opt.displayName ?? opt.id;
      if (opt?.name) optionMap[opt.name] = opt.name;
      if (opt?.value) optionMap[opt.value] = opt.name ?? opt.label ?? opt.displayName ?? opt.value;
    });

    param.data?.propertyFilters?.fields?.forEach((f) => {
      if (typeof f.field === "string" && f.field.startsWith("searchable.")) {
        const propId = f.field.split(".")[1];
        if (f.displayName) propertyNameMap[propId] = f.displayName;
        else if (f.externalId) propertyNameMap[propId] = f.externalId;
      }
      if (f.displayName && f.field) propertyNameMap[f.field] = f.displayName;
    });

    param.validations?.forEach((validation) => {
      validation.propertyValidations?.forEach((pv) => {
        pv.options?.forEach((opt) => {
          if (opt.id) optionMap[opt.id] = opt.displayName || opt.name || opt.label || opt.id;
        });
        if (pv.propertyId) {
          const name = pv.propertyDisplayName || pv.propertyExternalId;
          if (name) propertyNameMap[pv.propertyId] = name;
        }
      });
    });

  };

  // ---------- PROPERTY MAPS ----------
  const storeProperty = (p) => {
    propertyNameMap[p.id] = p.displayName || p.name || p.label || p.id;
    p.choices?.forEach((c) => {
      if (c.id) optionMap[c.id] = c.displayName || c.name || c.label || c.id;
    });
  };
  wf.objects?.forEach((obj) => obj.properties?.forEach(storeProperty));
  wf.objectRequests?.forEach((obj) => obj.propertyRequests?.forEach(storeProperty));

  // ---------- GATHER ALL PARAMS ----------
  wf.parameterRequests?.forEach(collectParam);
  wf.stageRequests?.forEach((stage) =>
    stage.taskRequests?.forEach((task) => {
      task.parameterRequests?.forEach(collectParam);
      task.automationRequests?.forEach((auto) => {
        auto.actionDetails?.choices?.forEach((c) => {
          if (c.id) optionMap[c.id] = c.displayName || c.name || c.label || c.id;
        });
      });
    })
  );

  // ---------- BUILD PARAM LOCATION MAP ----------
  // Maps paramId → { stageName, taskName } so that unresolvable resource object IDs
  // in rule inputs can be inferred from the context of the params they show/hide.
  const paramLocationMap = {};
  wf.stageRequests?.forEach((stage) => {
    stage.taskRequests?.forEach((task) => {
      task.parameterRequests?.forEach((p) => {
        paramLocationMap[String(p.id)] = { stageName: stage.name, taskName: task.name };
      });
    });
  });

  // ---------- BUILD VISIBILITY MAP ----------
  // Second pass after parameterMap is fully populated so target names can be resolved.
  const allParams = [
    ...(wf.parameterRequests || []),
    ...(wf.stageRequests?.flatMap((s) => s.taskRequests?.flatMap((t) => t.parameterRequests || []) || []) || []),
  ];
  allParams.forEach((param) => {
    if (!param?.rules?.length) return;
    param.rules.forEach((rule) => {
      const showIds = rule.show?.parameters || [];
      const hideIds = rule.hide?.parameters || [];

      const inputValues = (rule.input || [])
        .map((inp) => {
          if (optionMap[inp]) return optionMap[inp];
          // Unresolved ID (e.g. resource object ID) — infer a readable label from
          // the stage/task context of the parameters this rule shows or hides.
          const locations = showIds
            .map((id) => paramLocationMap[String(id)])
            .filter(Boolean);
          if (locations.length) {
            const uniqueStages = [...new Set(locations.map((l) => l.stageName))];
            if (uniqueStages.length > 0) return uniqueStages[0];
          }
          return inp;
        })
        .join(" / ");

      // Populate target params (what gets shown/hidden)
      showIds.forEach((targetId) => {
        visibilityMap[targetId] = (visibilityMap[targetId] ? visibilityMap[targetId] + "\n" : "")
          + `Visible when "${param.label}" is "${inputValues}"`;
      });
      hideIds.forEach((targetId) => {
        visibilityMap[targetId] = (visibilityMap[targetId] ? visibilityMap[targetId] + "\n" : "")
          + `Hidden when "${param.label}" is "${inputValues}"`;
      });

    });
  });

  // ---------- MAKE ROW ----------
  const makeRow = (stage, task, param, automationText, taskObj, isLastParam) => {
    const filtersText = getFiltersText(param) || "N/A";
    const validationsText = getValidationsText(param) || "N/A";
    const branchingText = visibilityMap[param.id] || "N/A";

    const dependenciesText = isLastParam && taskObj ? getDependenciesText(taskObj) : "N/A";
    const executorLockText = isLastParam && taskObj ? getExecutorLockText(taskObj) : "N/A";
    const automationDetails = isLastParam ? automationText || "" : "";

    let options = "N/A";
    if (Array.isArray(param.data)) {
      options =
        param.data.map((d) => d?.name || d?.label || d?.value).filter(Boolean).join(" • ") ||
        "N/A";
    } else if (Array.isArray(param.data?.choices)) {
      options =
        param.data.choices.map((d) => d?.name || d?.label || d?.value).filter(Boolean).join(" • ") ||
        "N/A";
    } else if (param.data?.collection) {
      options = `[Resource: ${param.data.objectTypeDisplayName || param.data.collection}]`;
    } else if (param.data?.text) {
      const stripped = param.data.text
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, " ")
        .trim();
      options = stripped || "N/A";
    }

    return {
      "Stage Name": stage,
      "Activity Name": task,
      Performer: "Performer/Verifier",
      "Activity Description in detail": `Performer provides input for ${param.label}.`,
      "Instruction Title": param.label,
      "Options / Values": options,
      "Field Type": param.mandatory ? "Mandatory" : "Optional",
      "Activity / Parameter Type": param.type || "N/A",
      Dependencies: dependenciesText,
      "Executor Lock": executorLockText,
      Branching: branchingText,
      Filters: filtersText,
      Validations: validationsText,
      "Automation Details": automationDetails,
      "Configuration Feasibility": "Configurable",
      "Configuration Feasibility Notes": "N/A",
      "Configuration Status": "Configured",
      "IS SELF VERIFICATION PRESENT?":
        param.verificationType === "SELF" || param.verificationType === "BOTH"
          ? "Enabled"
          : "Disabled",
      "Tester Comments": "N/A",
      "IS PEER VERIFICATION PRESENT?":
        param.verificationType === "BOTH" ? "Enabled" : "Disabled",
      "Tester Comments (B)": "N/A",
    };
  };

  // ---------- PROCESS STAGES ----------
  wf.stageRequests?.forEach((stage) => {
    stage.taskRequests?.forEach((task) => {
      const automationText = buildAutomationText(task);
      const params = task.parameterRequests || [];
      params.forEach((p, idx) =>
        csvRows.push(makeRow(stage.name, task.name, p, automationText, task, idx === params.length - 1))
      );
    });
  });

  // ---------- PROCESS CJF PARAMETERS ----------
  const cjfParams = wf.parameterRequests || [];
  cjfParams.forEach((p, idx) =>
    csvRows.push(makeRow("Create Job Form", p.label, p, "", null, idx === cjfParams.length - 1))
  );
};
