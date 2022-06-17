import React from 'react';
import { DATE_RANGE_OPTIONS, CUSTOM_RANGE } from 'App/dateRange'
import Select from 'Shared/Select';
import Period, { LAST_7_DAYS } from 'Types/app/period';
import { components } from 'react-select';
import DateRangePopup from 'Shared/DateRangeDropdown/DateRangePopup';
import OutsideClickDetectingDiv from 'Shared/OutsideClickDetectingDiv';
import cn from 'classnames';

interface Props {
    period: any,
    onChange: (data: any) => void;
    disableCustom?: boolean;
    right?: boolean;
    [x: string]: any;
}
function SelectDateRange(props: Props) {
    const [isCustom, setIsCustom] = React.useState(false);
    const { right = false, period, disableCustom = false, ...rest } = props;
    let selectedValue = DATE_RANGE_OPTIONS.find((obj: any) => obj.value === period.rangeName)
    const options = DATE_RANGE_OPTIONS.filter((obj: any) => disableCustom ? obj.value !== CUSTOM_RANGE : true);

    const onChange = (value: any) => {
        if (value === CUSTOM_RANGE) {
            setIsCustom(true);
        } else {
            props.onChange(new Period({ rangeName: value }));
        }
    }

    const onApplyDateRange = (value: any) => {
        props.onChange(new Period({ rangeName: CUSTOM_RANGE, start: value.start, end: value.end }));
        setIsCustom(false);
    }

    return (
        <div className="relative">
            <Select
                plain
                value={selectedValue}
                options={options}
                onChange={({ value }: any) => onChange(value.value)}
                components={{ SingleValue: ({ children, ...props} : any) => {
                    return (
                        <components.SingleValue {...props}>
                            {period.rangeName === CUSTOM_RANGE ? period.rangeFormatted() : children}
                        </components.SingleValue>
                    )
                } }}
                period={period}
                right={true}
                style={{ width: '100%' }}
            />
            {
            isCustom &&
            <OutsideClickDetectingDiv 
                onClickOutside={() => setIsCustom(false)}
            >
                <div className={ cn("absolute top-0 mt-10 z-40", { 'right-0' : right })} style={{ 
                    width: '770px',
                    // margin: 'auto 50vh 0',
                    // transform: 'translateX(-50%)'
                }}>
                    <DateRangePopup
                        onApply={ onApplyDateRange }
                        onCancel={ () => setIsCustom(false) }
                        selectedDateRange={ period.range }
                    />
                </div>
            </OutsideClickDetectingDiv>
            }
        </div>
    );
}

export default SelectDateRange;

  