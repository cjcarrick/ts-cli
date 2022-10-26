import prettier from 'prettier';
export const prettierConfig = {
    semi: false,
    singleQuote: true,
    useTabs: false,
    tabWidth: 2,
    trailingComma: 'none',
    printWidth: 80,
    arrowParens: 'avoid',
};
export const format = (src, fileExtension) => {
    const formatted = prettier.format(src, {
        ...prettierConfig,
        filepath: `file.${fileExtension}`
    });
    return formatted;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJldHRpZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvdXRpbHMvcHJldHRpZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxRQUErQyxNQUFNLFVBQVUsQ0FBQTtBQUV0RSxNQUFNLENBQUMsTUFBTSxjQUFjLEdBQTRCO0lBQ3JELElBQUksRUFBRSxLQUFLO0lBQ1gsV0FBVyxFQUFFLElBQUk7SUFDakIsT0FBTyxFQUFFLEtBQUs7SUFDZCxRQUFRLEVBQUUsQ0FBQztJQUNYLGFBQWEsRUFBRSxNQUFNO0lBQ3JCLFVBQVUsRUFBRSxFQUFFO0lBQ2QsV0FBVyxFQUFFLE9BQU87Q0FDckIsQ0FBQTtBQUVELE1BQU0sQ0FBQyxNQUFNLE1BQU0sR0FBRyxDQUFDLEdBQVcsRUFBRSxhQUFxQixFQUFFLEVBQUU7SUFDM0QsTUFBTSxTQUFTLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUU7UUFDckMsR0FBRyxjQUFjO1FBQ2pCLFFBQVEsRUFBRSxRQUFRLGFBQWEsRUFBRTtLQUNsQyxDQUFDLENBQUE7SUFFRixPQUFPLFNBQVMsQ0FBQTtBQUNsQixDQUFDLENBQUEifQ==