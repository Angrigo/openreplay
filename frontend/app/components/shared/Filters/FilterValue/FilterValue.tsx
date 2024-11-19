import React, { useState } from 'react';
import FilterAutoComplete from '../FilterAutoComplete';
import FilterAutoCompleteLocal from '../FilterAutoCompleteLocal';
import { FilterKey, FilterCategory, FilterType } from 'Types/filter/filterType';
import FilterValueDropdown from '../FilterValueDropdown';
import FilterDuration from '../FilterDuration';
import { debounce } from 'App/utils';
import { assist as assistRoute, isRoute } from 'App/routes';
import cn from 'classnames';
import { observer } from 'mobx-react-lite';

const ASSIST_ROUTE = assistRoute();

interface Props {
  filter: any;
  onUpdate: (filter: any) => void;
  isConditional?: boolean;
}
function FilterValue(props: Props) {
  const { filter } = props;
  const [durationValues, setDurationValues] = useState({
    minDuration: filter.value[0],
    maxDuration: filter.value.length > 1 ? filter.value[1] : filter.value[0],
  });
  const showCloseButton = filter.value.length > 1;

  const onAddValue = () => {
    const newValue = filter.value.concat('');
    props.onUpdate({ ...filter, value: newValue });
  };

  const onRemoveValue = (valueIndex: any) => {
    const newValue = filter.value.filter(
      (_: any, index: any) => index !== valueIndex
    );
    props.onUpdate({ ...filter, value: newValue });
  };

  const onChange = (e: any, item: any, valueIndex: any) => {
    const newValues = filter.value.map((_: any, _index: any) => {
      if (_index === valueIndex) {
        return item;
      }
      return _;
    });
    props.onUpdate({ ...filter, value: newValues });
  };

  const debounceOnSelect = React.useCallback(debounce(onChange, 500), [
    onChange,
  ]);

  const onDurationChange = (newValues: any) => {
    setDurationValues({ ...durationValues, ...newValues });
  };

  const handleBlur = () => {
    if (filter.type === FilterType.DURATION) {
      const { maxDuration, minDuration } = filter;
      if (maxDuration || minDuration) return;
      if (
        maxDuration !== durationValues.maxDuration ||
        minDuration !== durationValues.minDuration
      ) {
        props.onUpdate({
          ...filter,
          value: [durationValues.minDuration, durationValues.maxDuration],
        });
      }
    }
  };

  const getParms = (key: any) => {
    let params: any = { type: filter.key };
    switch (filter.category) {
      case FilterCategory.METADATA:
        params = { type: FilterKey.METADATA, key: key };
    }

    if (isRoute(ASSIST_ROUTE, window.location.pathname)) {
      params = { ...params, live: true };
    }

    return params;
  };

  const renderValueFiled = (value: any[]) => {
    const showOrButton = filter.value.length > 1;
    const valueIndex = 0;
    const BaseFilterLocalAutoComplete = (props) => (
      <FilterAutoCompleteLocal
        value={value}
        showCloseButton={showCloseButton}
        onAddValue={onAddValue}
        onRemoveValue={(index) => onRemoveValue(index)}
        onSelect={(e, item, index) => debounceOnSelect(e, item, index)}
        icon={filter.icon}
        {...props}
      />
    );
    switch (filter.type) {
      case FilterType.NUMBER_MULTIPLE:
        return <BaseFilterLocalAutoComplete type="number" />;
      case FilterType.NUMBER:
        return (
          <BaseFilterLocalAutoComplete
            type="number"
            allowDecimals={false}
            isMultiple={false}
          />
        );
      case FilterType.STRING:
        return <BaseFilterLocalAutoComplete />;
      case FilterType.DROPDOWN:
        return (
          <FilterValueDropdown
            value={value}
            placeholder={filter.placeholder}
            options={filter.options}
            onChange={(item, index) => onChange(null, { value: item.value }, index)}
          />
        );
      case FilterType.ISSUE:
      case FilterType.MULTIPLE_DROPDOWN:
        return (
          <FilterValueDropdown
            search={true}
            value={value}
            placeholder={filter.placeholder}
            options={filter.options}
            onChange={(item, index) => onChange(null, { value: item.value }, index)}
            onAddValue={onAddValue}
            onRemoveValue={(ind) => onRemoveValue(ind)}
            showCloseButton={showCloseButton}
            showOrButton={showOrButton}
          />
        );
      case FilterType.DURATION:
        return (
          <FilterDuration
            onChange={onDurationChange}
            onBlur={handleBlur}
            minDuration={durationValues.minDuration}
            maxDuration={durationValues.maxDuration}
            isConditional={props.isConditional}
          />
        );
      case FilterType.MULTIPLE:
        return (
          <FilterAutoComplete
            value={value}
            showCloseButton={showCloseButton}
            showOrButton={showOrButton}
            onAddValue={onAddValue}
            onRemoveValue={() => onRemoveValue(valueIndex)}
            method={'GET'}
            endpoint="/PROJECT_ID/events/search"
            params={getParms(filter.key)}
            headerText={''}
            placeholder={filter.placeholder}
            onSelect={(e, item) => onChange(e, item, valueIndex)}
            icon={filter.icon}
          />
        );
    }
  };

  return (
    <div
      className={cn('grid gap-3', {
        'grid-cols-2': filter.hasSource,
        'grid-cols-3': !filter.hasSource,
      })}
    >
      {renderValueFiled(filter.value)}
    </div>
  );
}

// const isEmpty = filter.value.length === 0 || !filter.value[0].length;
// return (
//   <div
//     className={
//         'rounded border border-gray-light px-2 relative w-fit whitespace-nowrap'
//     }
//     style={{ height: 26 }}
//     ref={filterValueContainer}
//   >
//       <div onClick={() => setShowValueModal(true)} className={'flex items-center gap-2 '}>
//           {!isEmpty ? (
//             <>
//                 <div
//                   className={
//                       'rounded-xl bg-gray-lighter  leading-none px-1 py-0.5'
//                   }
//                 >
//                     {filter.value[0]}
//                 </div>
//                 <div
//                   className={
//                       'rounded-xl bg-gray-lighter leading-none px-1 py-0.5'
//                   }
//                 >
//                     + {filter.value.length - 1} More
//                 </div>
//             </>
//           ) : (
//              <div className={'text-disabled-text'}>Select values</div>
//            )}
//       </div>
//       {showValueModal ? (
//         <div
//           className={cn(
//             'absolute left-0 mt-6 flex items-center gap-2 bg-white border shadow border-gray-light z-10',
//             {
//                 'grid-cols-2': filter.hasSource,
//                 'grid-cols-3': !filter.hasSource,
//             }
//           )}
//           style={{ minWidth: 200, minHeight: 100, top: '100%' }}
//         >
//             {filter.type === FilterType.DURATION
//              ? renderValueFiled(filter.value, 0)
//              : filter.value &&
//                filter.value.map((value: any, valueIndex: any) => (
//                  <div key={valueIndex}>
//                      {renderValueFiled(value, valueIndex)}
//                  </div>
//                ))}
//             <div>
//                 <Button>Apply</Button>
//                 <Button>Cancel</Button>
//             </div>
//         </div>
//       ) : null}
//   </div>
// );

export default observer(FilterValue);
